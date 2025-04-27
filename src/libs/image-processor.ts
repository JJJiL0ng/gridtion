export const processImage = async (imageFile: File, gridType: '3x1' | '3x2' | '3x3' = '3x2') => {
    // 이미지 로드
    const image = await loadImage(imageFile);
    
    // 그리드 설정
    const rows = gridType === '3x1' ? 1 : gridType === '3x2' ? 2 : 3;
    const cols = 3;
    const overlapPixels = 8;  // 좌우 중복 픽셀 수
    
    // 분할된 이미지를 저장할 배열
    const gridImages: Blob[] = [];
    
    // 원본 이미지 비율을 유지하면서 조정
    const canvasWidth = image.width;
    const canvasHeight = image.height;
    
    // 각 그리드 요소의 크기 계산 (중복 영역 없이)
    const gridWidth = canvasWidth / cols;
    const gridHeight = canvasHeight / rows;
    
    // 디버깅
    console.log(`원본 이미지 크기: ${canvasWidth}x${canvasHeight}`);
    console.log(`그리드 크기 (중복 제외): ${gridWidth}x${gridHeight}`);
    
    // 각 그리드 아이템 생성
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas 컨텍스트를 생성할 수 없습니다.');
        }
        
        // 이 그리드 셀이 좌측 가장자리에 있는지
        const isLeftEdge = col === 0;
        // 이 그리드 셀이 우측 가장자리에 있는지
        const isRightEdge = col === cols - 1;
        
        // 캔버스 폭 계산 (중복 영역 포함)
        let cellWidth = gridWidth;
        // 왼쪽에 중복 영역이 필요하면 추가
        if (!isLeftEdge) {
          cellWidth += overlapPixels;
        }
        // 오른쪽에 중복 영역이 필요하면 추가
        if (!isRightEdge) {
          cellWidth += overlapPixels;
        }
        
        // 캔버스 크기 설정
        canvas.width = cellWidth;
        canvas.height = gridHeight;
        
        // 원본 이미지에서 잘라낼 영역의 시작점
        let sourceX = col * gridWidth;
        // 왼쪽에 중복 영역이 필요한 경우 (첫번째 열이 아닌 경우)
        if (!isLeftEdge) {
          sourceX -= overlapPixels;
        }
        
        const sourceY = row * gridHeight;
        
        // 원본 이미지에서 잘라낼 영역의 폭
        const sourceWidth = cellWidth;
        
        // 이미지 그리기
        ctx.drawImage(
          image,
          sourceX, sourceY, sourceWidth, gridHeight,
          0, 0, canvas.width, canvas.height
        );
        
        // 디버깅용 테두리 (개발 중에 확인용으로만 사용)
        // ctx.strokeStyle = 'red';
        // ctx.lineWidth = 2;
        // ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // 디버깅용 - 중복 영역 표시 (개발 중에 확인용으로만 사용)
        // if (!isLeftEdge) {
        //   ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        //   ctx.fillRect(0, 0, overlapPixels, canvas.height);
        // }
        // if (!isRightEdge) {
        //   ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
        //   ctx.fillRect(canvas.width - overlapPixels, 0, overlapPixels, canvas.height);
        // }
        
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
  
  // 프리뷰용 그리드 레이아웃 생성 함수
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
        
        // 전체 캔버스 크기 계산
        // 첫 번째 행의 이미지들로부터 전체 폭 계산
        let totalWidth = 0;
        for (let col = 0; col < cols; col++) {
          const img = images[col];
          // 첫 번째 열이면 전체 폭
          if (col === 0) {
            totalWidth += img.width;
          } 
          // 중간 열들은 중복 영역을 제외한 폭
          else {
            totalWidth += img.width - overlapPixels;
          }
        }
        
        // 모든 행의 이미지를 합한 높이
        let totalHeight = 0;
        for (let row = 0; row < rows; row++) {
          totalHeight += images[row * cols].height;
        }
        
        // 프리뷰 캔버스 생성
        const previewCanvas = document.createElement('canvas');
        const ctx = previewCanvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas 컨텍스트를 생성할 수 없습니다.');
        }
        
        previewCanvas.width = totalWidth;
        previewCanvas.height = totalHeight;
        
        // 각 이미지 그리기
        let yOffset = 0;
        
        for (let row = 0; row < rows; row++) {
          let xOffset = 0;
          
          for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            const img = images[index];
            
            if (col === 0) {
              // 첫 번째 열은 전체 이미지 그리기
              ctx.drawImage(img, xOffset, yOffset);
              xOffset += img.width;
            } else {
              // 두 번째 열부터는 중복 영역을 제외하고 그리기
              ctx.drawImage(
                img, 
                overlapPixels, 0, img.width - overlapPixels, img.height,
                xOffset, yOffset, img.width - overlapPixels, img.height
              );
              xOffset += img.width - overlapPixels;
            }
          }
          
          yOffset += images[row * cols].height;
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