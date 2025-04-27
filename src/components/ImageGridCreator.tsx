'use client';

import { useState, useEffect } from 'react';
import { processImage, getGridPositionLabel, createGridPreview } from '@/libs/image-processor';
import JSZip from 'jszip';

export default function DebugImageGridCreator() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [gridImages, setGridImages] = useState<Blob[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [gridType, setGridType] = useState<'3x1' | '3x2' | '3x3'>('3x2');
  const [showDebugLines, setShowDebugLines] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setOriginalImage(e.target.files[0]);
      setGridImages([]); // 이전 결과 초기화
      setPreviewImage(null); // 이전 프리뷰 초기화
      setErrorMessage(null); // 이전 에러 초기화
    }
  };
  
  const handleProcessImage = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    
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
      setErrorMessage(`이미지 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDownloadAll = async () => {
    if (gridImages.length === 0) return;
    
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      
      // 개별 이미지 추가
      gridImages.forEach((blob, index) => {
        zip.file(`grid-${gridType}-${index + 1}.png`, blob);
      });
      
      // 프리뷰 이미지도 추가 (있는 경우)
      if (previewImage) {
        // URL에서 Blob 가져오기
        const previewBlob = await fetch(previewImage).then(r => r.blob());
        zip.file(`preview-${gridType}-complete.png`, previewBlob);
      }
      
      // README 파일 추가
      const readmeContent = `인스타그램 그리드 메이커 - ${gridType} 그리드

업로드 순서:
${Array.from({ length: gridImages.length }).map((_, idx) => 
  `${idx + 1}. ${getGridPositionLabel(idx)}`
).join('\n')}

인스타그램에 업로드할 때:
1. 각 이미지를 위 순서대로 정확히 업로드하세요.
2. 각 이미지를 1:1 비율로 설정하세요.
3. 필터는 모든 이미지에 동일하게 적용하거나 적용하지 마세요.

감사합니다!`;
      
      zip.file('README.txt', readmeContent);
      
      // ZIP 생성 및 다운로드
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(zipBlob);
      downloadLink.download = `instagram-grid-${gridType}-${new Date().getTime()}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
    } catch (error) {
      console.error('ZIP 파일 생성 중 오류 발생:', error);
      setErrorMessage('이미지 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };
  
  const getGridColumns = () => {
    const rows = gridType === '3x1' ? 1 : gridType === '3x2' ? 2 : 3;
    return `grid-cols-3 grid-rows-${rows}`;
  };
  
  // 디버그용 경계선 토글
  const toggleDebugLines = () => {
    setShowDebugLines(!showDebugLines);
  };
  
  // 원본 이미지 정보 표시
  const [originalImageInfo, setOriginalImageInfo] = useState<{ width: number; height: number } | null>(null);
  
  useEffect(() => {
    if (originalImage) {
      const img = new Image();
      img.onload = () => {
        setOriginalImageInfo({
          width: img.width,
          height: img.height
        });
        URL.revokeObjectURL(img.src); // 메모리 해제
      };
      img.src = URL.createObjectURL(originalImage);
    } else {
      setOriginalImageInfo(null);
    }
  }, [originalImage]);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">인스타그램 그리드 메이커 (디버그 모드)</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-4">
        <h2 className="font-bold text-yellow-800">디버그 모드 활성화</h2>
        <p className="text-yellow-700 text-sm">
          이 모드는 개발자를 위한 기능입니다. 이미지 처리 및 중복 픽셀 확인을 위한 디버깅 정보를 제공합니다.
        </p>
      </div>
      
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
      
      {originalImageInfo && (
        <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100">
          <h3 className="font-semibold text-blue-800">원본 이미지 정보</h3>
          <p className="text-blue-700 text-sm">
            크기: {originalImageInfo.width} x {originalImageInfo.height} 픽셀
          </p>
          <p className="text-blue-700 text-sm">
            {gridType} 분할 시 각 그리드 크기: {Math.round(originalImageInfo.width / 3)} x {Math.round(originalImageInfo.height / (gridType === '3x1' ? 1 : gridType === '3x2' ? 2 : 3))} 픽셀
          </p>
          <p className="text-blue-700 text-sm">
            중복 영역: 좌우 각각 16픽셀 (첫번째/마지막 열 제외)
          </p>
        </div>
      )}
      
      <div className="flex space-x-4 mb-4">
        {originalImage && (
          <button 
            onClick={handleProcessImage}
            disabled={isProcessing}
            className={`bg-blue-500 hover:bg-blue-600 text-white p-2 rounded grow ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? '처리 중...' : '그리드 생성하기'}
          </button>
        )}
        
        <button
          onClick={toggleDebugLines}
          className={`p-2 rounded ${showDebugLines ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
        >
          {showDebugLines ? '디버그 라인 숨기기' : '디버그 라인 표시'}
        </button>
      </div>
      
      {errorMessage && (
        <div className="mb-4 bg-red-50 p-3 rounded border border-red-200 text-red-700">
          <h3 className="font-semibold">오류 발생</h3>
          <p>{errorMessage}</p>
        </div>
      )}
      
      {previewImage && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">완성 프리뷰</h2>
          <div className="border p-2 bg-gray-100 rounded relative">
            <img 
              src={previewImage} 
              alt="완성된 그리드 프리뷰" 
              className="w-full h-auto mx-auto"
            />
            {showDebugLines && (
              <div className="absolute inset-0 pointer-events-none">
                {/* 수직 그리드 라인 */}
                <div className="absolute left-1/3 top-0 bottom-0 border-l-2 border-red-500 border-dashed opacity-50"></div>
                <div className="absolute left-2/3 top-0 bottom-0 border-l-2 border-red-500 border-dashed opacity-50"></div>
                
                {/* 수평 그리드 라인 - 그리드 타입에 따라 다름 */}
                {gridType !== '3x1' && (
                  <>
                    <div className="absolute left-0 right-0 top-1/2 border-t-2 border-red-500 border-dashed opacity-50"></div>
                    {gridType === '3x3' && (
                      <>
                        <div className="absolute left-0 right-0 top-1/3 border-t-2 border-red-500 border-dashed opacity-50"></div>
                        <div className="absolute left-0 right-0 top-2/3 border-t-2 border-red-500 border-dashed opacity-50"></div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
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
              {gridImages.map((blob, index) => {
                const url = URL.createObjectURL(blob);
                return (
                  <div key={index} className="border rounded overflow-hidden shadow-sm">
                    <div className="relative">
                      <img 
                        src={url} 
                        alt={`Grid ${index + 1}`}
                        className="w-full h-auto"
                      />
                      {showDebugLines && (
                        <div className="absolute inset-0 pointer-events-none">
                          {/* 중복 영역 표시 - 첫 번째 열이 아니면 왼쪽에 중복 영역 */}
                          {index % 3 !== 0 && (
                            <div className="absolute left-0 top-0 bottom-0 w-4 bg-red-500 opacity-30"></div>
                          )}
                          {/* 마지막 열이 아니면 오른쪽에 중복 영역 */}
                          {index % 3 !== 2 && (
                            <div className="absolute right-0 top-0 bottom-0 w-4 bg-blue-500 opacity-30"></div>
                          )}
                          {/* 그리드 경계 */}
                          <div className="absolute inset-0 border-2 border-yellow-500 opacity-50"></div>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-100 text-center p-2 text-sm">
                      {getGridPositionLabel(index)}
                      {showDebugLines && (
                        <div className="mt-1 text-xs text-gray-600">
                          중복 영역: {index % 3 !== 0 ? '왼쪽' : ''} {index % 3 !== 2 ? (index % 3 !== 0 ? '및 ' : '') + '오른쪽' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <button 
            onClick={handleDownloadAll}
            disabled={isDownloading}
            className={`bg-green-500 hover:bg-green-600 text-white p-3 rounded w-full flex items-center justify-center ${isDownloading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ZIP 파일 생성 중...
              </>
            ) : '모든 이미지 ZIP으로 다운로드'}
          </button>
        </>
      )}
    </div>
  );
}