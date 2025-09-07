"use client";
import React, { useState, useRef } from "react";
import { X, Upload, FileText, Lock, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "../../../components/Button";
import { Card as PlanCard, CardContent as PlanCardContent, CardHeader as PlanCardHeader, CardTitle as PlanCardTitle } from "../../../components/Card";
import { validateCASFile, extractBrokerFromFilename, formatCASDataForDisplay, type CASData } from "./casParser";
import { parseCASFile, importCASData } from "../../../../lib/dynamodb";

interface ImportStocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: CASData) => void;
}

export default function ImportStocksModal({ isOpen, onClose, onImport }: ImportStocksModalProps) {
  const [broker, setBroker] = useState("Other");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const brokers = [
    "Other",
    "Zerodha",
    "Groww", 
    "Upstox",
    "Angel"
  ];

  // Define supported file formats for each broker
  const brokerFileFormats = {
    "Other": {
      label: "CAS File",
      description: "Upload your Consolidated Account Statement (CAS)",
      accept: ".pdf",
      helpText: "CAS (Consolidated Account Statement) is a document that contains all your holdings across different brokers."
    },
    "Zerodha": {
      label: "Zerodha Holdings File",
      description: "Upload your Zerodha holdings export file",
      accept: ".csv,.pdf",
      helpText: "Export your holdings from Zerodha Console as CSV or upload your CAS file."
    },
    "Groww": {
      label: "Groww Holdings File", 
      description: "Upload your Groww holdings export file",
      accept: ".csv,.pdf",
      helpText: "Export your holdings from Groww app as CSV or upload your CAS file."
    },
    "Upstox": {
      label: "Upstox Holdings File",
      description: "Upload your Upstox holdings export file", 
      accept: ".csv,.pdf",
      helpText: "Export your holdings from Upstox Pro as CSV or upload your CAS file."
    },
    "Angel": {
      label: "Angel Holdings File",
      description: "Upload your Angel holdings export file",
      accept: ".csv,.pdf", 
      helpText: "Export your holdings from Angel One as CSV or upload your CAS file."
    }
  };

  const isSubmitDisabled = !selectedFile || (broker === "Other" && !password.trim());

  // Get current broker format configuration
  const currentFormat = brokerFileFormats[broker as keyof typeof brokerFileFormats];

  // File validation function
  const validateFile = (file: File, selectedBroker: string): boolean => {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return false;
    }
    
    const format = brokerFileFormats[selectedBroker as keyof typeof brokerFileFormats];
    const acceptedTypes = format.accept.split(',').map(type => type.trim());
    
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return acceptedTypes.includes(fileExtension);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file, broker)) {
        setSelectedFile(file);
        setError("");
        // Auto-detect broker from filename
        const detectedBroker = extractBrokerFromFilename(file.name);
        if (detectedBroker !== 'Other') {
          setBroker(detectedBroker);
        }
      } else {
        const currentFormat = brokerFileFormats[broker as keyof typeof brokerFileFormats];
        setError(`Please upload a valid file (${currentFormat.accept}) under 10MB`);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateFile(file, broker)) {
        setSelectedFile(file);
        setError("");
        // Auto-detect broker from filename
        const detectedBroker = extractBrokerFromFilename(file.name);
        if (detectedBroker !== 'Other') {
          setBroker(detectedBroker);
        }
      } else {
        const currentFormat = brokerFileFormats[broker as keyof typeof brokerFileFormats];
        setError(`Please upload a valid file (${currentFormat.accept}) under 10MB`);
      }
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || (broker === "Other" && !password.trim())) return;

    setIsProcessing(true);
    setError("");

    try {
      // Step 1: Parse the CAS file using the import-stocks lambda
      const casData = await parseCASFile(selectedFile, password, broker);
      
      // Step 2: Import the parsed data to holdings using portfolio lambda
      const result = await importCASData(casData);
      
      // Call the onImport callback with the result
      onImport(result);
      onClose();
      
      // Reset form
      setSelectedFile(null);
      setPassword("");
      setBroker("Other");
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : "Failed to process CAS file. Please check the file and password.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
      setSelectedFile(null);
      setPassword("");
      setBroker("Other");
      setError("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="absolute inset-x-4 top-16 mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-8 sm:top-20">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-foreground">Import Stocks from CAS</div>
            <div className="text-sm text-muted-foreground mt-1">Upload your Consolidated Account Statement</div>
          </div>
          <button 
            onClick={handleClose} 
            disabled={isProcessing}
            className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50" 
            aria-label="Close"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Broker Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Broker
            </label>
            <select
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {brokers.map((brokerOption) => (
                <option key={brokerOption} value={brokerOption}>
                  {brokerOption}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {currentFormat.label}
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={currentFormat.accept}
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="mx-auto h-8 w-8 text-primary" />
                  <div className="text-sm font-medium text-foreground">{selectedFile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-rose-600 hover:text-rose-700"
                    disabled={isProcessing}
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div className="text-sm font-medium text-foreground">
                    Drop your {currentFormat.label.toLowerCase()} here or click to browse
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentFormat.description}
                  </div>
                </div>
              )}
            </div>
            
            {/* Help Link */}
            <div className="mt-2">
              <a
                href="#"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  alert(currentFormat.helpText);
                }}
              >
                <ExternalLink size={12} />
                {broker === "Other" ? "How to generate CAS?" : "How to export holdings?"}
              </a>
            </div>
          </div>

          {/* Password Field - Only show for CAS files (Other broker) */}
          {broker === "Other" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter CAS password"
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm text-foreground"
                  disabled={isProcessing}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Password used to protect your CAS file
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span className="text-sm text-rose-700 dark:text-rose-300">{error}</span>
            </div>
          )}

          {/* Note */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Existing stocks in your portfolio will be updated with the imported data.
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            
            <Button
              type="submit"
              disabled={isSubmitDisabled || isProcessing}
              className="min-w-[140px]"
            >
              {isProcessing ? "Processing..." : "Import Stocks"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}