export const processImage = async (imageFile: File, gridType: '3x1' | '3x2' | '3x3' = '3x2') => {
    // 이미지 로드
    const image = await loadImage(imageFile);
    
    // 그리드 설정
    const rows = gridType === '3x1' ? 1 : gridType === '3x2' ? 2 : 3;
    const cols = 3;
    const overlapPixels = 16;  // 좌우 중복 픽셀 수
    
    // 분할된 이미지를 저장할 배열
    const gridImages: Blob[] = [];
    
    // 원본 이미지를 4:3 비율로 조정
    const originalWidth = image.width;
    const originalHeight = image.height;
    const targetRatio = 4 / 3; // 인스타그램 표준 4:3 비율 (가로가 더 길다)
    
    // 이미지 비율에 따라 크롭할 영역 계산
    let cropX = 0;
    let cropY = 0;
    let cropWidth = originalWidth;
    let cropHeight = originalHeight;
    
    const currentRatio = originalWidth / originalHeight;
    
    if (currentRatio > targetRatio) {
      // 이미지가 더 넓은 경우, 좌우를 크롭
      cropWidth = originalHeight * targetRatio;
      cropX = (originalWidth - cropWidth) / 2;
    } else if (currentRatio < targetRatio) {
      // 이미지가 더 높은 경우, 상하를 크롭
      cropHeight = originalWidth / targetRatio;
      cropY = (originalHeight - cropHeight) / 2;
    }
    
    // 각 그리드 셀의 실제 크기 계산 (인스타그램에서 보여질 부분)
    const cellWidth = cropWidth / cols;
    const cellHeight = cropHeight / rows;
    
    // 디버깅
    console.log(`원본 이미지 크기: ${originalWidth}x${originalHeight}`);
    console.log(`크롭된 이미지 크기: ${cropWidth}x${cropHeight}`);
    console.log(`그리드 셀 크기: ${cellWidth}x${cellHeight}`);
    
    // 각 그리드 아이템 생성
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas 컨텍스트를 생성할 수 없습니다.');
        }
        
        // 각 셀에 좌우로 16픽셀씩 추가
        canvas.width = cellWidth + (2 * overlapPixels);
        canvas.height = cellHeight;
        
        // 원본 이미지에서 해당 그리드 셀의 위치 계산
        const sourceX = cropX + (col * cellWidth) - overlapPixels;
        const sourceY = cropY + (row * cellHeight);
        const sourceWidth = cellWidth + (2 * overlapPixels);
        
        // 배경을 흰색으로 채우기 (이미지 경계를 벗어난 부분용)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 이미지 그리기
        ctx.drawImage(
          image,
          Math.max(0, sourceX), sourceY, 
          Math.min(sourceWidth, originalWidth - Math.max(0, sourceX)), cellHeight,
          Math.max(0, -sourceX), 0, 
          Math.min(sourceWidth, originalWidth - Math.max(0, sourceX)), cellHeight
        );
        
        // PNG로 변환
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('이미지를 Blob으로 변환할 수 없습니다.'));
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
  
  // 프리뷰용 그리드 레이아웃 생성 함수 - 인스타그램 피드에서 실제로 보이는 모습
  export const createGridPreview = (
    gridImages: Blob[], 
    gridType: '3x1' | '3x2' | '3x3'
  ): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const rows = gridType === '3x1' ? 1 : gridType === '3x2' ? 2 : 3;
        const cols = 3;
        const overlapPixels = 16;
        
        if (gridImages.length !== rows * cols) {
          throw new Error('그리드 이미지 수가 맞지 않습니다.');
        }
        
        // 모든 이미지 로드
        const images: HTMLImageElement[] = [];
        for (const blob of gridImages) {
          const img = await createImageFromBlob(blob);
          images.push(img);
        }
        
        // 단일 이미지의 실제 표시 크기 (중복 영역 제외)
        const singleImageWidth = images[0].width - (2 * overlapPixels);
        const singleImageHeight = images[0].height;
        
        // 전체 캔버스 크기 계산 (실제 인스타그램 피드에서 보이는 크기)
        const totalWidth = singleImageWidth * cols;
        const totalHeight = singleImageHeight * rows;
        
        // 프리뷰 캔버스 생성
        const previewCanvas = document.createElement('canvas');
        const ctx = previewCanvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas 컨텍스트를 생성할 수 없습니다.');
        }
        
        previewCanvas.width = totalWidth;
        previewCanvas.height = totalHeight;
        
        // 각 이미지 그리기 - 좌우 16픽셀 제외하고 그리기
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            const img = images[index];
            
            // 좌우 16픽셀을 제외한 중앙 부분만 그리기
            ctx.drawImage(
              img,
              overlapPixels, 0, singleImageWidth, singleImageHeight, // 소스: 좌우 16픽셀 제외
              col * singleImageWidth, row * singleImageHeight, singleImageWidth, singleImageHeight // 대상: 그리드 위치
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
  
  // 원본 크기 프리뷰 생성 (추가 기능)
  export const createOriginalPreview = (
    gridImages: Blob[], 
    gridType: '3x1' | '3x2' | '3x3'
  ): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const rows = gridType === '3x1' ? 1 : gridType === '3x2' ? 2 : 3;
        const cols = 3;
        
        if (gridImages.length !== rows * cols) {
          throw new Error('그리드 이미지 수가 맞지 않습니다.');
        }
        
        // 모든 이미지 로드
        const images: HTMLImageElement[] = [];
        for (const blob of gridImages) {
          const img = await createImageFromBlob(blob);
          images.push(img);
        }
        
        // 전체 캔버스 크기 계산 (좌우 모든 픽셀 포함)
        const totalWidth = images[0].width * cols;
        const totalHeight = images[0].height * rows;
        
        // 프리뷰 캔버스 생성
        const previewCanvas = document.createElement('canvas');
        const ctx = previewCanvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas 컨텍스트를 생성할 수 없습니다.');
        }
        
        previewCanvas.width = totalWidth;
        previewCanvas.height = totalHeight;
        
        // 각 이미지 그리기 - 모든 픽셀 포함
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            const img = images[index];
            
            ctx.drawImage(
              img,
              0, 0, img.width, img.height, // 소스: 전체 이미지
              col * img.width, row * img.height, img.width, img.height // 대상: 그리드 위치
            );
          }
        }
        
        // 프리뷰 이미지를 Blob으로 변환
        previewCanvas.toBlob(blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('원본 프리뷰 이미지를 생성할 수 없습니다.'));
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