/**
 * FigCraft Studio — Auto-Layout Computation Engine
 * Flexbox-style layout engine for nested design frames.
 */

export class AutoLayoutEngine {
  static computeLayout(frameNode) {
    if (!frameNode || frameNode.type !== 'FRAME' || !frameNode.autoLayout || !frameNode.autoLayout.enabled) {
      return;
    }

    const cfg = frameNode.autoLayout;
    const isHorizontal = cfg.direction === 'HORIZONTAL';
    const gap = cfg.gap || 0;
    const padTop = cfg.paddingTop || 0;
    const padRight = cfg.paddingRight || 0;
    const padBottom = cfg.paddingBottom || 0;
    const padLeft = cfg.paddingLeft || 0;

    let currentOffset = isHorizontal ? padLeft : padTop;
    const availableCross = isHorizontal ? 
      Math.max(0, frameNode.height - padTop - padBottom) : 
      Math.max(0, frameNode.width - padLeft - padRight);

    for (const child of frameNode.children) {
      if (!child.visible) continue;

      // Position along primary axis
      if (isHorizontal) {
        child.x = currentOffset;
        currentOffset += child.width + gap;
      } else {
        child.y = currentOffset;
        currentOffset += child.height + gap;
      }

      // Alignment along cross axis
      if (cfg.alignItems === 'CENTER') {
        if (isHorizontal) {
          child.y = padTop + (availableCross - child.height) / 2;
        } else {
          child.x = padLeft + (availableCross - child.width) / 2;
        }
      } else if (cfg.alignItems === 'END') {
        if (isHorizontal) {
          child.y = padTop + availableCross - child.height;
        } else {
          child.x = padLeft + availableCross - child.width;
        }
      } else {
        // START
        if (isHorizontal) {
          child.y = padTop;
        } else {
          child.x = padLeft;
        }
      }
    }
  }

  static applyRecursive(node) {
    if (node.type === 'FRAME' && node.autoLayout && node.autoLayout.enabled) {
      this.computeLayout(node);
    }
    for (const child of node.children) {
      this.applyRecursive(child);
    }
  }
}
