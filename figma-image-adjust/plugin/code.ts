/// <reference types="@figma/plugin-typings" />

type FillableNode = SceneNode & {
  fills: ReadonlyArray<Paint> | PluginAPI['mixed'];
};

type PluginMessage =
  | { type: 'ready' }
  | { type: 'apply'; bytes: Uint8Array | ArrayBuffer; width: number; height: number };

function isFillableNode(node: SceneNode): node is FillableNode {
  return 'fills' in node;
}

// Plugin 視窗尺寸
figma.showUI(__html__, { width: 360, height: 560, title: 'Image Adjust' });

// 取得選取節點的第一個 ImagePaint fill 的圖片 bytes
async function getImageBytesFromSelection(): Promise<
  { bytes: Uint8Array; width: number; height: number } | { error: string }
> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    return { error: '請在 Figma 中選取一個含圖片的節點' };
  }
  if (selection.length > 1) {
    return { error: '請只選取一個節點' };
  }

  const node = selection[0];

  // 確認節點有 fills 屬性
  if (!isFillableNode(node) || node.fills === figma.mixed) {
    return { error: '選取的節點不包含圖片' };
  }

  const imageFill = node.fills.find((f): f is ImagePaint => f.type === 'IMAGE');

  if (!imageFill || !imageFill.imageHash) {
    return { error: '選取的節點不包含圖片' };
  }

  const image = figma.getImageByHash(imageFill.imageHash);
  if (!image) {
    return { error: '無法讀取圖片資料' };
  }

  const bytes = await image.getBytesAsync();

  // 取得圖片實際尺寸
  const size = await image.getSizeAsync();

  if (size.width > 4096 || size.height > 4096) {
    return { error: `圖片尺寸超過 WebGL 限制（最大 4096px，目前 ${size.width}×${size.height}）` };
  }

  return { bytes, width: size.width, height: size.height };
}

// Plugin 啟動：等待 UI ready 後傳送圖片
figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'ready') {
    const result = await getImageBytesFromSelection();

    if ('error' in result) {
      figma.ui.postMessage({ type: 'error', message: result.error });
      return;
    }

    figma.ui.postMessage({ type: 'image', bytes: result.bytes, width: result.width, height: result.height });
  }

  if (msg.type === 'apply') {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1) {
      figma.notify('套用失敗：節點已變更，請重新開啟 Plugin');
      return;
    }

    const node = selection[0];
    if (!isFillableNode(node) || node.fills === figma.mixed) {
      figma.notify('套用失敗：節點已變更，請重新開啟 Plugin');
      return;
    }

    const fills = [...node.fills];
    const imageFillIndex = fills.findIndex((f) => f.type === 'IMAGE');

    if (imageFillIndex === -1) {
      figma.notify('套用失敗：找不到圖片 fill');
      return;
    }

    // 建立新圖片並替換 fill
    const encodedBytes = msg.bytes instanceof Uint8Array ? msg.bytes : new Uint8Array(msg.bytes);
    const newImage = figma.createImage(encodedBytes);
    fills[imageFillIndex] = {
      ...(fills[imageFillIndex] as ImagePaint),
      imageHash: newImage.hash,
    };
    node.fills = fills;

    figma.notify('✓ 套用成功');
  }
};
