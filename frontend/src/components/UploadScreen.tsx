import React, { useState, useCallback } from "react";
import { Upload, File, X, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface UploadScreenProps {
  onResultsReady: () => void;
}

export default function UploadScreen({ onResultsReady }: UploadScreenProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    // Simulate AI Truth Engine analysis
    setTimeout(() => {
      setIsProcessing(false);
      onResultsReady();
    }, 2800);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="heading-font text-5xl font-semibold tracking-tighter text-[#0a2540] mb-2">
        Upload Invoices
      </h1>
      <p className="text-gray-600 mb-8 text-xl">
        Our Truth Engine™ will verify them instantly with AI
      </p>

      {/* Drag & Drop Zone */}
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
            <p className="text-xl font-medium text-gray-700 mb-2">
              Drag &amp; drop your PDF invoices
            </p>
            <p className="text-gray-500">or click to browse files</p>
            <p className="text-xs text-gray-400 mt-6">PDF only • Max 20 files</p>
          </>
        )}
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="mb-8">
          <h3 className="font-medium mb-4">Selected files ({files.length})</h3>
          <div className="space-y-3">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white border rounded-3xl p-4"
              >
                <div className="flex items-center gap-3">
                  <File size={20} />
                  <span className="font-medium">{file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process Button */}
      <button
        onClick={handleProcess}
        disabled={files.length === 0 || isProcessing}
        className="w-full bg-[#00d4c8] hover:bg-[#00b8ae] disabled:bg-gray-300 text-[#0a2540] font-semibold text-xl py-7 rounded-3xl flex items-center justify-center gap-3 transition-all"
      >
        {isProcessing ? (
          <>
            <Loader2 className="animate-spin" size={26} />
            Truth Engine™ analysing...
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