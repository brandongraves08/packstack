import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface ImageAnalyzerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageAnalyzer = ({ open, onOpenChange }: ImageAnalyzerProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('http://localhost:5001/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setAnalysis(data.analysis || data.error);
    } catch (error) {
      console.error('Error:', error);
      setAnalysis('Error analyzing image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Analyze Image Inventory</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || loading}
            className="w-full"
          >
            {loading ? 'Analyzing...' : 'Analyze Image'}
          </Button>
          {analysis && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <pre className="whitespace-pre-wrap">{analysis}</pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


