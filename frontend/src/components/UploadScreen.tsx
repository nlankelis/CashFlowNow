import { useCallback, useState } from "react";
import { Upload, File, X, Loader2, AlertTriangle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { API_BASE_URL } from "../api";
import type { ProcessedInvoiceResult } from "../types/invoice";

interface UploadScreenProps {
  onResultsReady: (results: ProcessedInvoiceResult[]) => void;
}

interface SupplementalFields {
  invoice_number: string;
  amount: string;
  due_date: string;
  debtor_name: string;
  debtor_email: string;
  debtor_phone: string;
}

const emptySupplementalFields: SupplementalFields = {
  invoice_number: "",
  amount: "",
  due_date: "",
  debtor_name: "",
  debtor_email: "",
  debtor_phone: "",
};

export default function UploadScreen({ onResultsReady }: UploadScreenProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplemental, setSupplemental] = useState<SupplementalFields>(emptySupplementalFields);

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

  const updateSupplementalField = (field: keyof SupplementalFields, value: string) => {
    setSupplemental((current) => ({ ...current, [field]: value }));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const results: ProcessedInvoiceResult[] = [];
      for (const file of files) {
        const startedAt = performance.now();
        const formData = new FormData();
        formData.append("file", file);
        Object.entries(supplemental).forEach(([key, value]) => {
          if (value.trim()) {
            formData.append(key, value.trim());
          }
        });

        const response = await axios.post(`${API_BASE_URL}/process-invoice`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        results.push({
          ...response.data,
          processing_time_ms: Math.round(performance.now() - startedAt),
        });
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
        Truth Engine extracts invoice fields and returns an instant factoring decision.
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

      <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-[#0a2540]">Optional extra details</h3>
          <p className="text-sm text-gray-500 mt-1">
            These values are used only when the PDF does not clearly contain them.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Invoice number</span>
            <input
              type="text"
              value={supplemental.invoice_number}
              onChange={(event) => updateSupplementalField("invoice_number", event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-[#00d4c8] focus:outline-none"
              placeholder="INV-10024"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Amount</span>
            <input
              type="text"
              value={supplemental.amount}
              onChange={(event) => updateSupplementalField("amount", event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-[#00d4c8] focus:outline-none"
              placeholder="1259.57"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Due date</span>
            <input
              type="date"
              value={supplemental.due_date}
              onChange={(event) => updateSupplementalField("due_date", event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-[#00d4c8] focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Debtor name</span>
            <input
              type="text"
              value={supplemental.debtor_name}
              onChange={(event) => updateSupplementalField("debtor_name", event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-[#00d4c8] focus:outline-none"
              placeholder="Northgate Electrical Services"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Debtor email</span>
            <input
              type="email"
              value={supplemental.debtor_email}
              onChange={(event) => updateSupplementalField("debtor_email", event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-[#00d4c8] focus:outline-none"
              placeholder="accounts@company.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Debtor phone</span>
            <input
              type="text"
              value={supplemental.debtor_phone}
              onChange={(event) => updateSupplementalField("debtor_phone", event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-[#00d4c8] focus:outline-none"
              placeholder="+44 20 1234 5678"
            />
          </label>
        </div>
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
