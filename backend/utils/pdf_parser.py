import re
import zlib


def parse_pdf_text(file_content: bytes) -> str:
    chunks = []
    chunks.extend(_extract_pdf_operator_text(file_content))
    chunks.extend(_extract_struct_tag_text(file_content))
    chunks.extend(_extract_hex_glyph_text(file_content))

    # Extract compressed streams (bounded to prevent decompression bombs)
    max_decompressed_bytes = 5 * 1024 * 1024
    for stream in re.findall(rb"stream\r?\n(.*?)\r?\nendstream", file_content, flags=re.DOTALL):
        for wbits in (zlib.MAX_WBITS, -zlib.MAX_WBITS):
            try:
                decompressor = zlib.decompressobj(wbits)
                inflated = decompressor.decompress(stream, max_length=max_decompressed_bytes)
                chunks.extend(_extract_pdf_operator_text(inflated))
                chunks.extend(_extract_hex_glyph_text(inflated))
                break
            except (zlib.error, MemoryError):
                continue

    if not chunks:
        decoded = file_content.decode("latin-1", errors="ignore")
        chunks = re.findall(r"[A-Za-z0-9@#£$€:./_,\-]{3,}", decoded)

    cleaned_chunks = []
    for chunk in chunks:
        normalized = _clean_pdf_string(chunk)
        if not normalized:
            continue
        if re.fullmatch(r"(?:<[0-9A-Fa-f]+>\s*)+", normalized):
            continue
        if normalized.startswith("<") and normalized.count("<") >= 2:
            continue
        cleaned_chunks.append(normalized)

    text = "\n".join(cleaned_chunks)
    return text.strip()


def _extract_pdf_operator_text(raw: bytes) -> list[str]:
    decoded = raw.decode("latin-1", errors="ignore")
    chunks = re.findall(r"\(([^()]*)\)\s*Tj", decoded)
    chunks.extend(re.findall(r"\(([^()]*)\)\s*TJ", decoded))
    chunks.extend(re.findall(r"\[(.*?)\]\s*TJ", decoded, flags=re.DOTALL))
    return chunks


def _extract_struct_tag_text(raw: bytes) -> list[str]:
    decoded = raw.decode("latin-1", errors="ignore")
    tags = []
    tags.extend(re.findall(r"/T\s*\((.*?)\)", decoded, flags=re.DOTALL))
    tags.extend(re.findall(r"/E\s*\((.*?)\)", decoded, flags=re.DOTALL))
    return tags


def _extract_hex_glyph_text(raw: bytes) -> list[str]:
    decoded = raw.decode("latin-1", errors="ignore")
    candidates = re.findall(r"(?:(?:<[0-9A-Fa-f]+>)(?:-?\d+(?:\.\d+)?)*){2,}", decoded)
    extracted: list[str] = []
    seen: set[str] = set()

    for candidate in candidates:
        glyphs: list[str] = []
        for token in re.findall(r"<([0-9A-Fa-f]+)>", candidate):
            if len(token) < 4 or len(token) % 4 != 0:
                continue

            for idx in range(0, len(token), 4):
                try:
                    code_point = int(token[idx : idx + 4], 16)
                except ValueError:
                    continue

                decoded_char = _decode_pdf_hex_codepoint(code_point)
                if decoded_char:
                    glyphs.append(decoded_char)

        line = "".join(glyphs)
        line = re.sub(r"\s+", " ", line).strip()
        if not line or line in seen:
            continue
        if not re.search(r"[A-Za-z0-9]", line):
            continue
        if len(re.findall(r"[A-Za-z0-9]", line)) < 3:
            continue

        seen.add(line)
        extracted.append(line)

    return extracted


def _decode_pdf_hex_codepoint(code_point: int) -> str:
    if 0x0003 <= code_point <= 0x001D:
        translated = code_point + 29
        return chr(translated) if 32 <= translated <= 126 else ""

    if 0x0020 <= code_point <= 0x007E:
        translated = code_point - 3
        return chr(translated) if 32 <= translated <= 126 else ""

    return ""


def _clean_pdf_string(value: str) -> str:
    return (
        value.replace("\\n", "\n")
        .replace("\\r", " ")
        .replace("\\t", " ")
        .replace("\\(", "(")
        .replace("\\)", ")")
        .strip()
    )

