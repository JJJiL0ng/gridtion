'use client';

import { useState } from 'react';
import { processImage, getGridPositionLabel, createGridPreview } from '@/libs/image-processor';

export default function ImageGridCreator() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [gridImages, setGridImages] = useState<Blob[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gridType, setGridType] = useState<'3x1' | '3x2' | '3x3'>('3x2');
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setOriginalImage(e.target.files[0]);
      setGridImages([]); // 이전 결과 초기화
      setPreviewImage(null); // 이전 프리뷰 초기화
    }
  };
  
  const handleProcessImage = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    try {
      // 이미지 처리
      const images = await processImage(originalImage, gridType);
      setGridImages(images);
      
      // 프리뷰 이미지 생성
      const previewBlob = await createGridPreview(images, gridType);
      const previewUrl = URL.createObjectURL(previewBlob);
      setPreviewImage(previewUrl);
    } catch (error) {
      console.error('이미지 처리 중 오류 발생:', error);
      alert('이미지 처리 중 오류가 발생했습니다.');
      // 에러 처리
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDownloadAll = () => {
    gridImages.forEach((blob, index) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `grid-${gridType}-${index + 1}.png`;
      link.click();
    });
  };
  
  const getGridColumns = () => {
    const rows = gridType === '3x1' ? 1 : gridType === '3x2' ? 2 : 3;
    return `grid-cols-3 grid-rows-${rows}`;
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">인스타그램 그리드 메이커</h1>
      
      <div className="mb-4">
        <label className="block mb-2">그리드 타입 선택</label>
        <select 
          value={gridType} 
          onChange={(e) => setGridType(e.target.value as '3x1' | '3x2' | '3x3')}
          className="border p-2 rounded"
        >
          <option value="3x1">3x1 그리드 (한 줄)</option>
          <option value="3x2">3x2 그리드 (두 줄)</option>
          <option value="3x3">3x3 그리드 (세 줄)</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">이미지 업로드</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          className="border p-2 rounded w-full"
        />
      </div>
      
      {originalImage && (
        <button 
          onClick={handleProcessImage}
          disabled={isProcessing}
          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded mb-4 w-full"
        >
          {isProcessing ? '처리 중...' : '그리드 생성하기'}
        </button>
      )}
      
      {previewImage && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">완성 프리뷰</h2>
          <div className="border p-2 bg-gray-100 rounded">
            <img 
              src={previewImage} 
              alt="완성된 그리드 프리뷰" 
              className="w-full h-auto mx-auto"
            />
            <p className="text-center text-sm mt-2 text-gray-600">
              인스타그램에 업로드했을 때의 모습(예상)
            </p>
          </div>
        </div>
      )}
      
      {gridImages.length > 0 && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">분할된 이미지</h2>
            <p className="text-sm text-gray-600 mb-4">
              아래 이미지들을 순서대로 인스타그램에 업로드하세요. 각 이미지는 인스타그램의 16픽셀 여백 문제를 보정했습니다.
            </p>
            <div className={`grid ${getGridColumns()} gap-4`}>
              {gridImages.map((blob, index) => (
                <div key={index} className="border rounded overflow-hidden shadow-sm">
                  <img 
                    src={URL.createObjectURL(blob)} 
                    alt={`Grid ${index + 1}`}
                    className="w-full h-auto"
                  />
                  <div className="bg-gray-100 text-center p-2 text-sm">
                    {getGridPositionLabel(index)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={handleDownloadAll}
            className="bg-green-500 hover:bg-green-600 text-white p-3 rounded w-full"
          >
            모든 이미지 다운로드
          </button>
          
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">인스타그램에 업로드하는 방법</h3>
            <ol className="list-decimal pl-5 space-y-2 text-blue-800">
              <li>모든 이미지를 다운로드합니다.</li>
              <li>인스타그램 앱을 열고 포스팅 버튼을 누릅니다.</li>
              <li>위에 표시된 번호 순서대로 이미지를 업로드합니다 (중요!).</li>
              <li>각 이미지를 1:1 비율로 맞춰 업로드합니다.</li>
              <li>모든 이미지를 업로드하면 프로필에서 완성된 그리드를 확인할 수 있습니다.</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}