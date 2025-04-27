export const processImage = async (imageFile: File, gridType: '3x1' | '3x2' | '3x3' = '3x2') => {
    // 이미지 로드
    const image = await loadImage(imageFile);
    
    // 그리드 설정
    const rows = gridType === '3x1' ? 1 : gridType === '3x2' ? 2 : 3;
    const cols = 3;
    const overlapPixels = 16;  // 좌우 중복 픽셀 수
    
    // 분할된 이미지를 저장할 배열
    const gridImages: Blob[] = [];
    
    // 원본 이미지 비율 조정 (4:3 비율로 크롭)
    let canvasWidth = image.width;
    let canvasHeight = image.height;
    const targetRatio = 4 / 3; // 인스타그램 표준 4:3 비율
    
    // 이미지 비율에 따라 크롭할 영역 계산
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = canvasWidth;
    let sourceHeight = canvasHeight;
    
    const currentRatio = canvasWidth / canvasHeight;
    
    if (currentRatio > targetRatio) {
      // 이미지가 더 넓은 경우, 좌우를 크롭
      sourceWidth = canvasHeight * targetRatio;
      sourceX = (canvasWidth - sourceWidth) / 2;
    } else if (currentRatio < targetRatio) {
      // 이미지가 더 높은 경우, 상하를 크롭
      sourceHeight = canvasWidth / targetRatio;
      sourceY = (canvasHeight - sourceHeight) / 2;
    }
    
    // 실제 사용할 캔버스 크기
    canvasWidth = sourceWidth;
    canvasHeight = sourceHeight;
    
    // 각 그리드 요소의 크기 계산 (중복 영역 없이)
    const gridWidth = canvasWidth / cols;
    const gridHeight = canvasHeight / rows;
    
    // 디버깅
    console.log(`원본 이미지 크기: ${image.width}x${image.height}`);
    console.log(`크롭된 이미지 크기: ${canvasWidth}x${canvasHeight}`);
    console.log(`그리드 크기 (중복 제외): ${gridWidth}x${gridHeight}`);
    
    // 각 그리드 아이템 생성
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas 컨텍스트를 생성할 수 없습니다.');
        }
        
        // 모든 셀에 좌우로 각각 16픽셀 추가
        canvas.width = gridWidth + (2 * overlapPixels); // 좌우 모두 추가
        canvas.height = gridHeight;
        
        // 원본 이미지에서 시작점 계산 
        // (왼쪽 16픽셀 앞에서 시작하되, 이미지 경계를 벗어나지 않도록)
        const cellX = sourceX + (col * gridWidth) - overlapPixels;
        const cellY = sourceY + (row * gridHeight);
        
        // 실제 그릴 너비 계산 (왼쪽이나 오른쪽이 이미지 밖으로 나갔을 경우 처리)
        let drawX = 0;
        let srcX = cellX;
        let srcWidth = canvas.width;
        
        // 왼쪽이 이미지 밖으로 나갔을 경우
        if (cellX < sourceX) {
          drawX = sourceX - cellX; // 캔버스에서 그리기 시작할 X 위치 조정
          srcX = sourceX; // 원본에서 가져올 X 위치 조정
          srcWidth = canvas.width - drawX; // 원본에서 가져올 너비 조정
        }
        
        // 오른쪽이 이미지 밖으로 나갔을 경우
        const rightEdge = cellX + canvas.width;
        if (rightEdge > sourceX + sourceWidth) {
          srcWidth = (sourceX + sourceWidth) - srcX; // 원본에서 가져올 너비 조정
        }
        
        // 배경을 흰색으로 채우기 (투명하면 인스타에서 검은색으로 보일 수 있음)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 이미지 그리기
        ctx.drawImage(
          image,
          srcX, cellY, srcWidth, gridHeight,
          drawX, 0, srcWidth, gridHeight
        );
        
        // 디버깅용 - 중복 영역 표시 (개발 중에 확인용으로만 사용)
        // ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        // ctx.fillRect(0, 0, overlapPixels, canvas.height);
        // ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
        // ctx.fillRect(canvas.width - overlapPixels, 0, overlapPixels, canvas.height);
        
        // PNG로 변환 (투명도 유지)
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
  
  // 프리뷰용 그리드 레이아웃 생성 함수 - 실제 인스타그램에서 보이는 상태로 프리뷰
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
        
        // 전체 캔버스 크기 계산
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
        
        // 각 이미지 그리기 - 중복 영역 제외하고 그리기
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            const img = images[index];
            
            // 중복 영역을 제외한 이미지 그리기
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
  
  // Blob에서 이미지 생성 헬퍼 함수
  const createImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  };