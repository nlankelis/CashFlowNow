import { useCallback, useState } from "react";
import { Upload, File, X, Loader2, AlertTriangle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { API_BASE_URL } from "../api";
import type { InvoiceDecisionResponse } from "../types/invoice";

interface UploadScreenProps {
  onResultsReady: (results: InvoiceDecisionResponse[]) => void;
}

export default function UploadScreen({ onResultsReady }: UploadScreenProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setFiles((prev) => [...prev, ...acceptedFiles].slice(0, 20));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const results: InvoiceDecisionResponse[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await axios.post<InvoiceDecisionResponse>(`${API_BASE_URL}/process-invoice`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        results.push(response.data);
      }

      onResultsReady(results);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? "Failed to process invoice(s). Check backend status.");
      } else {
        setError("Failed to process invoice(s).");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="heading-font text-5xl font-semibold tracking-tighter text-[#0a2540] mb-2">
        Upload Invoices
      </h1>
      <p className="text-gray-600 mb-8 text-xl">
        Truth Engine MVP extracts invoice fields and returns an instant factoring decision.
      </p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer mb-8 ${
          isDragActive
            ? "border-[#00d4c8] bg-[#00d4c8]/5"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={48} className="mx-auto text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-xl font-medium text-[#00d4c8]">Drop your PDFs here...</p>
        ) : (
          <>
            <p className="text-xl font-medium text-gray-700 mb-2">Drag &amp; drop your PDF invoices</p>
            <p className="text-gray-500">or click to browse files</p>
            <p className="text-xs text-gray-400 mt-6">PDF only • Max 20 files • Max 10MB per file</p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="mb-8">
          <h3 className="font-medium mb-4">Selected files ({files.length})</h3>
          <div className="space-y-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-white border rounded-3xl p-4"
              >
                <div className="flex items-center gap-3">
                  <File size={20} />
                  <span className="font-medium">{file.name}</span>
                </div>
                <button onClick={() => removeFile(index)} className="text-red-500 hover:text-red-600">
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3 text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleProcess}
        disabled={files.length === 0 || isProcessing}
        className="w-full bg-[#00d4c8] hover:bg-[#00b8ae] disabled:bg-gray-300 text-[#0a2540] font-semibold text-xl py-7 rounded-3xl flex items-center justify-center gap-3 transition-all"
      >
        {isProcessing ? (
          <>
            <Loader2 className="animate-spin" size={26} />
            Analysing invoice(s)...
          </>
        ) : (
          <>
            <Upload size={26} />
            Process {files.length} invoice{files.length !== 1 ? "s" : ""}
          </>
        )}
      </button>
    </div>
  );
}
