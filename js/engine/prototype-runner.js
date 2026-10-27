/**
 * FigCraft Studio — Interactive Prototyping Runner
 * Presentation viewer for running interactive clickable flows.
 */

export class PrototypeRunner {
  constructor(doc, modalElement, containerElement) {
    this.doc = doc;
    this.modal = modalElement;
    this.container = containerElement;
    this.currentFrame = null;
    this.history = [];
  }

  start(initialFrame = null) {
    const frames = this.doc.getAllFrames();
    if (frames.length === 0) {
      alert('Please create at least one Frame to present prototype.');
      return;
    }

    this.currentFrame = initialFrame || frames[0];
    this.history = [this.currentFrame];
    this.modal.classList.add('active');
    this.renderCurrentFrame();
  }

  stop() {
    this.modal.classList.remove('active');
    this.container.innerHTML = '';
  }

  renderCurrentFrame() {
    this.container.innerHTML = '';
    if (!this.currentFrame) return;

    const frame = this.currentFrame;
    const isMobile = frame.width <= 480;

    const wrapper = document.createElement('div');
    if (isMobile) {
      wrapper.className = 'device-frame-mockup';
      wrapper.style.width = `${frame.width}px`;
      wrapper.style.height = `${frame.height}px`;
    } else {
      wrapper.style.boxShadow = '0 20px 50px rgba(0,0,0,0.8)';
      wrapper.style.borderRadius = '8px';
      wrapper.style.overflow = 'hidden';
      wrapper.style.width = `${frame.width}px`;
      wrapper.style.height = `${frame.height}px`;
    }

    // Render Frame Canvas
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = frame.fill || '#ffffff';
    ctx.fillRect(0, 0, frame.width, frame.height);

    // Render children
    for (const child of frame.children) {
      this.renderNodeToCanvas(ctx, child, 0, 0);
    }
    wrapper.appendChild(canvas);

    // Attach Hotspot Overlays for interactive clicks
    this.attachHotspots(wrapper, frame);

    this.container.appendChild(wrapper);
  }

  attachHotspots(wrapper, parentNode) {
    for (const child of parentNode.children) {
      if (child.prototypeLink && child.prototypeLink.targetFrameId) {
        const hotspot = document.createElement('div');
        hotspot.style.position = 'absolute';
        hotspot.style.left = `${child.x}px`;
        hotspot.style.top = `${child.y}px`;
        hotspot.style.width = `${child.width}px`;
        hotspot.style.height = `${child.height}px`;
        hotspot.style.cursor = 'pointer';
        hotspot.style.zIndex = '50';
        hotspot.setAttribute('title', `Navigate to ${child.prototypeLink.targetFrameId}`);

        hotspot.addEventListener('click', (e) => {
          e.stopPropagation();
          const target = this.doc.findNodeById(child.prototypeLink.targetFrameId);
          if (target && target.type === 'FRAME') {
            this.currentFrame = target;
            this.history.push(target);
            this.renderCurrentFrame();
          }
        });

        wrapper.appendChild(hotspot);
      }
      if (child.children && child.children.length > 0) {
        this.attachHotspots(wrapper, child);
      }
    }
  }

  renderNodeToCanvas(ctx, node, parentX, parentY) {
    if (!node.visible) return;
    const x = parentX + node.x;
    const y = parentY + node.y;

    ctx.save();
    ctx.globalAlpha = node.opacity;

    if (node.type === 'RECTANGLE' || node.type === 'FRAME') {
      ctx.fillStyle = node.fill || '#ffffff';
      if (node.cornerRadius > 0) {
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, node.width, node.height, node.cornerRadius) : ctx.rect(x, y, node.width, node.height);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, node.width, node.height);
      }
    } else if (node.type === 'ELLIPSE') {
      ctx.fillStyle = node.fill || '#a855f7';
      ctx.beginPath();
      ctx.ellipse(x + node.width / 2, y + node.height / 2, node.width / 2, node.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (node.type === 'TEXT') {
      ctx.fillStyle = node.fill || '#18181b';
      ctx.font = `${node.fontWeight || '400'} ${node.fontSize || 16}px ${node.fontFamily || 'sans-serif'}`;
      ctx.textBaseline = 'top';
      ctx.fillText(node.text || '', x, y);
    }

    if (node.stroke) {
      ctx.strokeStyle = node.stroke;
      ctx.lineWidth = node.strokeWidth || 1;
      ctx.stroke();
    }

    for (const sub of node.children) {
      this.renderNodeToCanvas(ctx, sub, x, y);
    }
    ctx.restore();
  }
}
