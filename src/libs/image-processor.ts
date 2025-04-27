export const processImage = async (imageFile: File, gridType: '3x1' | '3x2' | '3x3' = '3x2') => {
    // 이미지 로드
    const image = await loadImage(imageFile);
    
    // 그리드 설정
    const rows = gridType === '3x1' ? 1 : gridType === '3x2' ? 2 : 3;
    const cols = 3;
    const horizontalOverlapPixels = 16;  // 좌우 중복 픽셀
    // const verticalOverlapPixels = 0;     // 상하 중복 픽셀 (필요 없으므로 0)
    
    // 분할된 이미지를 저장할 배열
    const gridImages: Blob[] = [];
    
    // 원본 이미지 비율을 유지하면서 조정
    const canvasWidth = image.width;
    const canvasHeight = image.height;
    
    // 각 그리드 요소의 크기 계산 (중복 없이)
    const gridWidth = canvasWidth / cols;
    const gridHeight = canvasHeight / rows;
    
    // 각 그리드 아이템 생성
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas 컨텍스트를 생성할 수 없습니다.');
        }
        
        // 중복 영역을 포함한 크기 계산
        // 좌우 중복만 적용
        canvas.width = gridWidth + 
          (col > 0 ? horizontalOverlapPixels : 0) + 
          (col < cols - 1 ? horizontalOverlapPixels : 0);
        // 상하 중복 없음
        canvas.height = gridHeight;
        
        // 원본 이미지에서 중복 영역을 고려한 위치 계산
        // 좌측 중복 영역 고려
        const srcX = col * gridWidth - (col > 0 ? horizontalOverlapPixels : 0);
        // 상하 중복 없음
        const srcY = row * gridHeight;
        
        // 이미지 그리기
        ctx.drawImage(
          image,
          srcX, srcY, canvas.width, canvas.height,
          0, 0, canvas.width, canvas.height
        );
        
        // 디버깅용 - 중복 영역 표시 (필요시 주석 해제)
        // if (col > 0) {
        //   ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        //   ctx.fillRect(0, 0, horizontalOverlapPixels, canvas.height);
        // }
        // if (col < cols - 1) {
        //   ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
        //   ctx.fillRect(canvas.width - horizontalOverlapPixels, 0, horizontalOverlapPixels, canvas.height);
        // }
        
        // PNG로 변환 (투명도 유지)
        const blob = await new Promise<Blob>(resolve => {
          canvas.toBlob(blob => {
            if (blob) {
              resolve(blob);
            } else {
              throw new Error('이미지를 Blob으로 변환할 수 없습니다.');
            }
          }, 'image/png', 1.0);
        });
        
        gridImages.push(blob);
      }
    }
    
    return gridImages;
  };
  
  // 이미지 로드 헬퍼 함수
  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };
  
  // 그리드 포지션 헬퍼 함수 (업로드 순서 안내용)
  export const getGridPositionLabel = (index: number): string => {
    const cols = 3;
    const row = Math.floor(index / cols) + 1;
    const col = (index % cols) + 1;
    
    // 인스타그램에 업로드할 때 올바른 순서 반환
    return `${row}행 ${col}열 (${index + 1}번째 업로드)`;
  };
  
  // 프리뷰용 그리드 레이아웃 생성 함수
  export const createGridPreview = (
    gridImages: Blob[], 
    gridType: '3x1' | '3x2' | '3x3'
  ): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const rows = gridType === '3x2' ? 2 : 3;
        const cols = 3;
        
        if (gridImages.length !== rows * cols) {
          throw new Error('그리드 이미지 수가 맞지 않습니다.');
        }
        
        // 첫 번째 이미지로부터 단일 그리드 크기 계산
        const firstImage = await createImageFromBlob(gridImages[0]);
        const gridWidth = firstImage.width;
        const gridHeight = firstImage.height;
        
        // 수평 중복 픽셀 (정확한 값을 알 수 없으므로 16으로 가정)
        const horizontalOverlapPixels = 16;
        
        // 프리뷰 캔버스 생성
        const previewCanvas = document.createElement('canvas');
        const ctx = previewCanvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas 컨텍스트를 생성할 수 없습니다.');
        }
        
        // 중복 영역을 제외한 전체 크기 계산
        previewCanvas.width = cols * gridWidth - (cols - 1) * (2 * horizontalOverlapPixels);
        previewCanvas.height = rows * gridHeight;
        
        // 각 그리드 이미지 그리기
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            const img = await createImageFromBlob(gridImages[index]);
            
            // 중복 영역 고려하여 위치 계산
            const x = col * (gridWidth - 2 * horizontalOverlapPixels) + 
                      (col > 0 ? horizontalOverlapPixels : 0);
            const y = row * gridHeight;
            
            // 좌측 중복 영역 제외하고 그리기 (첫 번째 열 제외)
            const sourceX = col > 0 ? horizontalOverlapPixels : 0;
            // 우측 중복 영역 제외하고 그리기 (마지막 열 제외)
            const drawWidth = col < cols - 1 ? 
                            gridWidth - horizontalOverlapPixels : 
                            gridWidth;
            
            ctx.drawImage(
              img,
              sourceX, 0, drawWidth, gridHeight,
              x, y, drawWidth, gridHeight
            );
          }
        }
        
        // 프리뷰 이미지를 Blob으로 변환
        previewCanvas.toBlob(blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('프리뷰 이미지를 생성할 수 없습니다.'));
          }
        }, 'image/png', 1.0);
        
      } catch (error) {
        reject(error);
      }
    });
  };
  
  // Blob에서 이미지 생성 헬퍼 함수
  const createImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  };