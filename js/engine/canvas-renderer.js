/**
 * FigCraft Studio — High-Performance Canvas Renderer
 * 60FPS 2D Canvas rendering with subpixel transform, smart redline distance guides,
 * vector networks, components, and interactive prototype connectors.
 */

export class CanvasRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    // Camera Viewport State
    this.zoom = 0.60;
    this.panX = 40;
    this.panY = 40;
    this.dpr = window.devicePixelRatio || 1;

    // View Modes: 'design' | 'prototype' | 'dev'
    this.mode = 'design';

    // 12-Column Layout Grid Toggle (Shot-6 Dashboard)
    this.showLayoutGrid = false;

    // Multiplayer Presence Toggle (Shot-7 Collab)
    this.showCollabPresence = false;

    // Alignment guides
    this.activeGuides = []; // [{ type: 'vertical', x: 200 }, { type: 'horizontal', y: 150 }]

    // Alt distance inspection state
    this.altKeyDown = false;

    // Active Pen drawing points
    this.activePenPoints = [];
    this.activePenCursor = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(this.dpr, this.dpr);
  }

  zoomToFit(doc, focusScreensOnly = true) {
    let items = [];
    if (focusScreensOnly) {
      items = doc.root.children.filter((c) => (c.type === 'FRAME' || c.type === 'COMPONENT') && c.x >= 0);
    }
    if (!items || items.length === 0) {
      items = doc.root.children.filter((c) => c.type === 'FRAME' || c.type === 'COMPONENT' || c.type === 'SECTION');
    }
    if (!items || items.length === 0) items = doc.root.children;
    if (!items || items.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const f of items) {
      minX = Math.min(minX, f.x);
      minY = Math.min(minY, f.y);
      maxX = Math.max(maxX, f.x + f.width);
      maxY = Math.max(maxY, f.y + f.height);
    }

    const padding = 50;
    const availW = Math.max(200, this.width - padding * 2);
    const availH = Math.max(200, this.height - padding * 2);
    const contentW = maxX - minX;
    const contentH = maxY - minY;

    if (contentW <= 0 || contentH <= 0) return;

    const scaleX = availW / contentW;
    const scaleY = availH / contentH;
    // Fit comfortably with 0.35 - 1.1 zoom range
    this.zoom = Math.min(Math.max(0.35, Math.min(scaleX, scaleY) * 0.95), 1.1);

    this.panX = (this.width - contentW * this.zoom) / 2 - minX * this.zoom;
    this.panY = Math.max(40, (this.height - contentH * this.zoom) / 2 - minY * this.zoom);
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.panX,
      y: wy * this.zoom + this.panY,
    };
  }

  render(doc, selectedNodes = [], hoveredNode = null) {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Dot Matrix Background Grid
    this.drawDotGrid(ctx);

    // Apply Camera Transform
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 2. Render Scene Graph Nodes
    for (const child of doc.root.children) {
      this.renderNode(ctx, child);
    }

    // 2b. Render 12-Column Layout Grid (Shot-6)
    if (this.showLayoutGrid) {
      this.drawLayoutGrid(ctx, doc);
    }

    // 3. Render Hover Highlight
    if (hoveredNode && !selectedNodes.includes(hoveredNode)) {
      this.drawHoverOutline(ctx, hoveredNode);
    }

    // 4. Render Active Pen Tool drawing in-progress
    if (this.activePenPoints && this.activePenPoints.length > 0) {
      this.drawActivePenPath(ctx);
    }

    // 5. Render Selection Box & Transform Handles
    if (selectedNodes.length > 0) {
      this.drawSelection(ctx, selectedNodes);
    }

    // 6. Render Smart Distance Redline Guides when Alt key is held
    if (this.altKeyDown && selectedNodes.length > 0) {
      this.drawAltDistanceGuides(ctx, selectedNodes[0], hoveredNode, doc);
    }

    // 7. Render Prototype Connections (Blue Curves with Arrowheads)
    if (this.mode === 'prototype') {
      this.drawPrototypeNoodles(ctx, doc);
    }

    // 8. Render Dev Mode Annotations (Shot-4)
    if (this.mode === 'dev') {
      this.drawDevAnnotations(ctx, doc);
    }

    // 9. Render Multiplayer Presence & Cursors (Shot-7 Collab)
    if (this.showCollabPresence) {
      this.drawCollabPresence(ctx, doc);
    }

    // 10. Render Smart Alignment Guides
    this.drawSmartGuides(ctx);

    ctx.restore();
    ctx.restore();
  }

  drawDotGrid(ctx) {
    const dotSpacing = 24 * this.zoom;
    if (dotSpacing < 8) return; // Skip if too dense

    const startX = this.panX % dotSpacing;
    const startY = this.panY % dotSpacing;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    const dotRadius = this.zoom > 1.2 ? 1.2 : 0.9;

    for (let x = startX; x < this.width; x += dotSpacing) {
      for (let y = startY; y < this.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  renderNode(ctx, node, parentAbsX = 0, parentAbsY = 0) {
    if (!node.visible) return;

    const absX = parentAbsX + node.x;
    const absY = parentAbsY + node.y;

    ctx.save();
    ctx.globalAlpha = node.opacity;

    // Effects: Drop Shadow
    if (node.effects && node.effects.length > 0) {
      for (const eff of node.effects) {
        if (eff.type === 'drop-shadow') {
          ctx.shadowColor = eff.color || 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = eff.blur || 12;
          ctx.shadowOffsetX = eff.x || 0;
          ctx.shadowOffsetY = eff.y || 4;
        }
      }
    }

    // Frame or Component Header Label
    if (node.type === 'FRAME' || node.type === 'COMPONENT') {
      ctx.save();
      ctx.fillStyle = node.type === 'COMPONENT' ? '#a855f7' : '#71717a';
      ctx.font = '600 11px Inter, sans-serif';
      const label = node.type === 'COMPONENT' ? `❖ ${node.name}` : node.name;
      ctx.fillText(label, absX, absY - 8);
      ctx.restore();
    }

    // Render Shapes
    if (node.type === 'FRAME' || node.type === 'RECTANGLE' || node.type === 'COMPONENT') {
      const fillStyle = this.resolveFillStyle(ctx, node.fill, absX, absY, node.width, node.height) || (typeof node.fill === 'string' ? node.fill : null);
      if (fillStyle && fillStyle !== 'transparent') {
        ctx.fillStyle = fillStyle;
        if (node.cornerRadius > 0) {
          this.roundedRect(ctx, absX, absY, node.width, node.height, node.cornerRadius);
          ctx.fill();
        } else {
          ctx.fillRect(absX, absY, node.width, node.height);
        }
      }

      // High-Fidelity Custom Vector Artwork Rendering
      if (node.name === 'Mountain Landscape Art') {
        this.drawAlpineLandscape(ctx, absX, absY, node.width, node.height, node.cornerRadius);
      } else if (node.name === 'Dusk Mountain Hero Art') {
        this.drawDuskAlpineHero(ctx, absX, absY, node.width, node.height, node.cornerRadius);
      } else if (node.name === 'Elevation Profile Chart') {
        this.drawElevationChart(ctx, absX, absY, node.width, node.height, node.cornerRadius);
      } else if (node.name === 'Night Mountain Art' || node.name.includes('GPS') || node.name.includes('Route')) {
        this.drawGpsTopoMap(ctx, absX, absY, node.width, node.height, node.cornerRadius);
      }

      // Draw Native iOS Status Bar Icons on Frames only if frame does not have its own status bar
      if (node.type === 'FRAME' && node.height > 600 && !node.children.some(c => c.name.toLowerCase().includes('status bar'))) {
        this.drawStatusBarIcons(ctx, absX, absY, node.width, node.fill);
      }
    } else if (node.type === 'ELLIPSE') {
      const fillStyle = this.resolveFillStyle(ctx, node.fill, absX, absY, node.width, node.height) || (typeof node.fill === 'string' ? node.fill : null);
      if (fillStyle && fillStyle !== 'transparent') {
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.ellipse(
          absX + node.width / 2,
          absY + node.height / 2,
          node.width / 2,
          node.height / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else if (node.type === 'TEXT') {
      ctx.fillStyle = this.resolveFillStyle(ctx, node.fill, absX, absY, node.width, node.height) || (typeof node.fill === 'string' ? node.fill : '#f4f4f5');
      ctx.font = `${node.fontWeight || '400'} ${node.fontSize || 16}px ${node.fontFamily || 'Inter, sans-serif'}`;
      ctx.textBaseline = 'top';
      ctx.fillText(node.text || '', absX, absY);
    } else if (node.type === 'VECTOR') {
      if (node.network && node.network.segments && node.network.segments.length > 0) {
        const verts = node.network.vertices || [];
        ctx.beginPath();
        for (let i = 0; i < node.network.segments.length; i++) {
          const seg = node.network.segments[i];
          const v1 = verts[seg.a];
          const v2 = verts[seg.b];
          if (!v1 || !v2) continue;

          const x1 = absX + v1.x;
          const y1 = absY + v1.y;
          const x2 = absX + v2.x;
          const y2 = absY + v2.y;

          if (i === 0) ctx.moveTo(x1, y1);
          if ((seg.ta && (seg.ta[0] !== 0 || seg.ta[1] !== 0)) || (seg.tb && (seg.tb[0] !== 0 || seg.tb[1] !== 0))) {
            const cp1x = x1 + (seg.ta ? seg.ta[0] : 0);
            const cp1y = y1 + (seg.ta ? seg.ta[1] : 0);
            const cp2x = x2 + (seg.tb ? seg.tb[0] : 0);
            const cp2y = y2 + (seg.tb ? seg.tb[1] : 0);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
          } else {
            ctx.lineTo(x2, y2);
          }
        }
        if (node.closed || (node.fill && node.fill !== 'transparent')) {
          ctx.closePath();
          ctx.fillStyle = this.resolveFillStyle(ctx, node.fill, absX, absY, node.width, node.height) || (typeof node.fill === 'string' ? node.fill : '#38bdf8');
          ctx.fill();
        }
      } else if (node.vertices && node.vertices.length > 1) {
        ctx.beginPath();
        ctx.moveTo(absX + (node.vertices[0].x - node.x), absY + (node.vertices[0].y - node.y));
        for (let i = 1; i < node.vertices.length; i++) {
          ctx.lineTo(absX + (node.vertices[i].x - node.x), absY + (node.vertices[i].y - node.y));
        }
        if (node.closed) {
          ctx.closePath();
          if (node.fill && node.fill !== 'transparent') {
            ctx.fillStyle = this.resolveFillStyle(ctx, node.fill, absX, absY, node.width, node.height) || (typeof node.fill === 'string' ? node.fill : '#38bdf8');
            ctx.fill();
          }
        }
      }
    } else if (node.type === 'STAR') {
      this.drawStar(ctx, absX, absY, node.width, node.height, node.points || 5, node.innerRatio || 0.38, node.fill);
    } else if (node.type === 'SECTION') {
      ctx.fillStyle = this.resolveFillStyle(ctx, node.fill, absX, absY, node.width, node.height) || (typeof node.fill === 'string' ? node.fill : 'rgba(255, 255, 255, 0.02)');
      ctx.fillRect(absX, absY, node.width, node.height);
      ctx.strokeStyle = node.stroke || 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = node.strokeWidth || 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(absX, absY, node.width, node.height);
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.fillText(node.name || 'Section', absX + 4, absY - 4);
    }

    // Render Stroke
    if (node.stroke) {
      ctx.strokeStyle = this.resolveFillStyle(ctx, node.stroke, absX, absY, node.width, node.height) || (typeof node.stroke === 'string' ? node.stroke : '#0d99ff');
      ctx.lineWidth = node.strokeWidth || 1;
      if (node.strokeStyle === 'dashed') {
        ctx.setLineDash([6, 6]);
      } else {
        ctx.setLineDash([]);
      }

      if (node.type === 'FRAME' || node.type === 'RECTANGLE' || node.type === 'COMPONENT') {
        if (node.cornerRadius > 0) {
          this.roundedRect(ctx, absX, absY, node.width, node.height, node.cornerRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(absX, absY, node.width, node.height);
        }
      } else if (node.type === 'ELLIPSE') {
        ctx.beginPath();
        ctx.ellipse(
          absX + node.width / 2,
          absY + node.height / 2,
          node.width / 2,
          node.height / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      } else if (node.type === 'VECTOR') {
        ctx.stroke();
      }
    }

    // Clip content for frames/components
    if ((node.type === 'FRAME' || node.type === 'COMPONENT') && node.clipContent) {
      ctx.save();
      ctx.beginPath();
      if (node.cornerRadius > 0) {
        this.roundedRect(ctx, absX, absY, node.width, node.height, node.cornerRadius);
      } else {
        ctx.rect(absX, absY, node.width, node.height);
      }
      ctx.clip();
      for (const child of node.children) {
        this.renderNode(ctx, child, absX, absY);
      }
      ctx.restore();
    } else {
      for (const child of node.children) {
        this.renderNode(ctx, child, absX, absY);
      }
    }

    ctx.restore();
  }

  drawHoverOutline(ctx, node) {
    const b = node.getAbsoluteBounds();
    ctx.save();
    ctx.strokeStyle = '#0d99ff';
    ctx.lineWidth = 1 / this.zoom;
    ctx.strokeRect(b.x - 0.5, b.y - 0.5, b.width + 1, b.height + 1);
    ctx.restore();
  }

  drawSelection(ctx, selectedNodes) {
    ctx.save();
    const handleSize = 7 / this.zoom;

    for (const node of selectedNodes) {
      const b = node.getAbsoluteBounds();

      // Selection outline (purple for components, blue for regular)
      ctx.strokeStyle = node.type === 'COMPONENT' ? '#a855f7' : '#0d99ff';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.strokeRect(b.x, b.y, b.width, b.height);

      // 8 Transform Handles
      const handles = [
        { x: b.x, y: b.y },
        { x: b.x + b.width / 2, y: b.y },
        { x: b.right, y: b.y },
        { x: b.right, y: b.y + b.height / 2 },
        { x: b.right, y: b.bottom },
        { x: b.x + b.width / 2, y: b.bottom },
        { x: b.x, y: b.bottom },
        { x: b.x, y: b.y + b.height / 2 },
      ];

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = node.type === 'COMPONENT' ? '#a855f7' : '#0d99ff';
      ctx.lineWidth = 1.5 / this.zoom;

      for (const h of handles) {
        ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      }

      // Prototyping Hotspot Handle (in Prototype Mode)
      if (this.mode === 'prototype') {
        const protoHandleX = b.right + 12 / this.zoom;
        const protoHandleY = b.y + b.height / 2;
        ctx.beginPath();
        ctx.arc(protoHandleX, protoHandleY, 6 / this.zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#a855f7';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawActivePenPath(ctx) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 / this.zoom;
    ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);

    ctx.beginPath();
    ctx.moveTo(this.activePenPoints[0].x, this.activePenPoints[0].y);
    for (let i = 1; i < this.activePenPoints.length; i++) {
      ctx.lineTo(this.activePenPoints[i].x, this.activePenPoints[i].y);
    }
    if (this.activePenCursor) {
      ctx.lineTo(this.activePenCursor.x, this.activePenCursor.y);
    }
    ctx.stroke();

    // Render vertex handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0284c7';
    for (const pt of this.activePenPoints) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4 / this.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawAltDistanceGuides(ctx, selectedNode, hoveredNode, doc) {
    const s = selectedNode.getAbsoluteBounds();
    const target = hoveredNode ? hoveredNode.getAbsoluteBounds() : (selectedNode.parent ? selectedNode.parent.getAbsoluteBounds() : null);

    if (!target) return;

    ctx.save();
    ctx.strokeStyle = '#ec4899';
    ctx.fillStyle = '#ec4899';
    ctx.lineWidth = 1 / this.zoom;
    ctx.font = 'bold 10px Inter, sans-serif';

    // Horizontal distance (if horizontally separated)
    if (s.x > target.right) {
      const dist = Math.round(s.x - target.right);
      const midY = s.y + s.height / 2;
      this.drawMeasureLine(ctx, target.right, midY, s.x, midY, `${dist}px`);
    } else if (s.right < target.x) {
      const dist = Math.round(target.x - s.right);
      const midY = s.y + s.height / 2;
      this.drawMeasureLine(ctx, s.right, midY, target.x, midY, `${dist}px`);
    }

    // Vertical distance (if vertically separated)
    if (s.y > target.bottom) {
      const dist = Math.round(s.y - target.bottom);
      const midX = s.x + s.width / 2;
      this.drawMeasureLine(ctx, midX, target.bottom, midX, s.y, `${dist}px`);
    } else if (s.bottom < target.y) {
      const dist = Math.round(target.y - s.bottom);
      const midX = s.x + s.width / 2;
      this.drawMeasureLine(ctx, midX, s.bottom, midX, target.y, `${dist}px`);
    }

    ctx.restore();
  }

  drawMeasureLine(ctx, x1, y1, x2, y2, label) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // End caps
    if (x1 === x2) {
      ctx.beginPath();
      ctx.moveTo(x1 - 4 / this.zoom, y1);
      ctx.lineTo(x1 + 4 / this.zoom, y1);
      ctx.moveTo(x2 - 4 / this.zoom, y2);
      ctx.lineTo(x2 + 4 / this.zoom, y2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x1, y1 - 4 / this.zoom);
      ctx.lineTo(x1, y1 + 4 / this.zoom);
      ctx.moveTo(x2, y2 - 4 / this.zoom);
      ctx.lineTo(x2, y2 + 4 / this.zoom);
      ctx.stroke();
    }

    // Measurement badge
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    ctx.save();
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.roundRect(mx - 18 / this.zoom, my - 8 / this.zoom, 36 / this.zoom, 16 / this.zoom, 3 / this.zoom);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
    ctx.restore();
  }

  drawPrototypeNoodles(ctx, doc) {
    ctx.save();
    const self = this;

    function traceLinks(node) {
      if (node.prototypeLink && node.prototypeLink.targetFrameId) {
        const target = doc.findNodeById(node.prototypeLink.targetFrameId);
        if (target) {
          const from = node.getAbsoluteBounds();
          const to = target.getAbsoluteBounds();

          const startX = from.right;
          const startY = from.y + from.height / 2;
          const endX = to.x;
          const endY = to.y + Math.min(220, to.height / 2);

          const dx = Math.abs(endX - startX) * 0.55;
          const cp1X = startX + dx;
          const cp1Y = startY;
          const cp2X = endX - dx;
          const cp2Y = endY;

          // Glowing blue cubic Bezier curve wire
          ctx.save();
          ctx.shadowColor = 'rgba(13, 153, 255, 0.7)';
          ctx.shadowBlur = 10 / self.zoom;
          ctx.strokeStyle = '#0d99ff';
          ctx.lineWidth = 3 / self.zoom;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
          ctx.stroke();
          ctx.restore();

          // Hotspot circle handle at origin with animated pulsating ring
          ctx.save();
          ctx.beginPath();
          ctx.arc(startX, startY, 7 / self.zoom, 0, Math.PI * 2);
          ctx.fillStyle = '#0d99ff';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 / self.zoom;
          ctx.stroke();
          ctx.restore();

          // Arrowhead at destination
          const arrowAngle = Math.atan2(endY - cp2Y, endX - cp2X);
          const arrowLen = 12 / self.zoom;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - arrowLen * Math.cos(arrowAngle - Math.PI / 6), endY - arrowLen * Math.sin(arrowAngle - Math.PI / 6));
          ctx.lineTo(endX - arrowLen * Math.cos(arrowAngle + Math.PI / 6), endY - arrowLen * Math.sin(arrowAngle + Math.PI / 6));
          ctx.closePath();
          ctx.fillStyle = '#0d99ff';
          ctx.fill();
          ctx.restore();

          // Interaction Pill Tag Badge at midpoint
          const midT = 0.5;
          const midX = (1 - midT) ** 3 * startX + 3 * (1 - midT) ** 2 * midT * cp1X + 3 * (1 - midT) * midT ** 2 * cp2X + midT ** 3 * endX;
          const midY = (1 - midT) ** 3 * startY + 3 * (1 - midT) ** 2 * midT * cp1Y + 3 * (1 - midT) * midT ** 2 * cp2Y + midT ** 3 * endY;

          const triggerText = node.prototypeLink.trigger || 'On click';
          const transitionText = node.prototypeLink.transition || 'Smart animate (300ms)';
          const tagLabel = `⚡ ${triggerText} ➔ ${transitionText}`;

          ctx.save();
          ctx.font = `bold ${10 / self.zoom}px Inter, sans-serif`;
          const textMetrics = ctx.measureText(tagLabel);
          const tagW = textMetrics.width + 20 / self.zoom;
          const tagH = 22 / self.zoom;

          ctx.fillStyle = '#09090b';
          ctx.strokeStyle = '#0d99ff';
          ctx.lineWidth = 1.5 / self.zoom;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 8 / self.zoom;

          ctx.beginPath();
          self.roundedRect(ctx, midX - tagW / 2, midY - tagH / 2, tagW, tagH, 11 / self.zoom);
          ctx.fill();
          ctx.stroke();

          ctx.shadowColor = 'transparent';
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tagLabel, midX, midY);
          ctx.restore();
        }
      }
      for (const child of node.children) traceLinks.call(this, child);
    }

    for (const child of doc.root.children) traceLinks.call(this, child);
    ctx.restore();
  }

  drawAlpineLandscape(ctx, x, y, w, h, r) {
    ctx.save();
    ctx.beginPath();
    this.roundedRect(ctx, x, y, w, h, r);
    ctx.clip();

    // Sky gradient (Deep alpine cyan to glowing morning horizon)
    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, '#0284c7');
    sky.addColorStop(0.55, '#38bdf8');
    sky.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);

    // Glowing morning sun
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h * 0.32, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 24;
    ctx.fill();
    ctx.restore();

    // Back mountain ridge (atmospheric haze)
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + h * 0.58);
    ctx.lineTo(x + w * 0.22, y + h * 0.38);
    ctx.lineTo(x + w * 0.44, y + h * 0.52);
    ctx.lineTo(x + w * 0.68, y + h * 0.32);
    ctx.lineTo(x + w * 0.88, y + h * 0.48);
    ctx.lineTo(x + w, y + h * 0.42);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    // Front jagged mountain with snowy crags
    ctx.fillStyle = '#075985';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + h * 0.7);
    ctx.lineTo(x + w * 0.32, y + h * 0.42);
    ctx.lineTo(x + w * 0.55, y + h * 0.64);
    ctx.lineTo(x + w * 0.82, y + h * 0.46);
    ctx.lineTo(x + w, y + h * 0.62);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    // Snow caps on front peak
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.32, y + h * 0.42);
    ctx.lineTo(x + w * 0.27, y + h * 0.52);
    ctx.lineTo(x + w * 0.31, y + h * 0.50);
    ctx.lineTo(x + w * 0.34, y + h * 0.54);
    ctx.lineTo(x + w * 0.38, y + h * 0.51);
    ctx.closePath();
    ctx.fill();

    // Foreground lush pine forest ridge
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + h * 0.82);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.72, x + w, y + h * 0.78);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    // Pine tree silhouettes
    ctx.fillStyle = '#022c22';
    for (let tx = x + 12; tx < x + w - 12; tx += 18) {
      const treeH = 16 + (Math.sin(tx) * 6);
      const ty = y + h * 0.85;
      ctx.beginPath();
      ctx.moveTo(tx, ty - treeH);
      ctx.lineTo(tx - 6, ty);
      ctx.lineTo(tx + 6, ty);
      ctx.closePath();
      ctx.fill();
    }

    // Winding Cyan Trail Ribbon
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 24, y + h * 0.92);
    ctx.bezierCurveTo(x + w * 0.3, y + h * 0.88, x + w * 0.45, y + h * 0.74, x + w * 0.65, y + h * 0.68);
    ctx.bezierCurveTo(x + w * 0.78, y + h * 0.62, x + w * 0.8, y + h * 0.52, x + w * 0.82, y + h * 0.46);
    ctx.stroke();

    ctx.restore();
  }

  drawDuskAlpineHero(ctx, x, y, w, h, r) {
    ctx.save();
    ctx.beginPath();
    this.roundedRect(ctx, x, y, w, h, r);
    ctx.clip();

    // Twilight Gradient (Deep violet to midnight)
    const dusk = ctx.createLinearGradient(x, y, x, y + h);
    dusk.addColorStop(0, '#1e1b4b');
    dusk.addColorStop(0.65, '#0f172a');
    dusk.addColorStop(1, '#18181b');
    ctx.fillStyle = dusk;
    ctx.fillRect(x, y, w, h);

    // Stars
    ctx.fillStyle = '#ffffff';
    const starCoords = [
      [0.15, 0.12], [0.28, 0.08], [0.42, 0.18], [0.65, 0.09], [0.82, 0.15],
      [0.91, 0.22], [0.35, 0.26], [0.74, 0.28], [0.52, 0.11], [0.08, 0.25]
    ];
    for (const [sx, sy] of starCoords) {
      ctx.beginPath();
      ctx.arc(x + w * sx, y + h * sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Massive Mt. Whitney Granite Ridge with Alpenglow
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + h * 0.55);
    ctx.lineTo(x + w * 0.48, y + h * 0.24);
    ctx.lineTo(x + w * 0.72, y + h * 0.44);
    ctx.lineTo(x + w, y + h * 0.38);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    // Sunset Alpenglow Rim Light on the Western Ridge
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.55);
    ctx.lineTo(x + w * 0.48, y + h * 0.24);
    ctx.stroke();

    // Summit Flag & Elevation Callout
    const sumX = x + w * 0.48;
    const sumY = y + h * 0.24;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(sumX, sumY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Neon Cyan Ascent Trail Line
    ctx.strokeStyle = '#0d99ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x + 30, y + h * 0.85);
    ctx.quadraticCurveTo(x + w * 0.35, y + h * 0.65, sumX, sumY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Summit Badge
    ctx.fillStyle = 'rgba(13, 153, 255, 0.25)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.roundedRect(ctx, sumX + 8, sumY - 14, 82, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▲ 14,505 ft', sumX + 49, sumY - 3);

    ctx.restore();
  }

  drawElevationChart(ctx, x, y, w, h, r) {
    ctx.save();
    ctx.beginPath();
    this.roundedRect(ctx, x, y, w, h, r);
    ctx.clip();

    ctx.fillStyle = '#27272a';
    ctx.fillRect(x, y, w, h);

    // Subtle dashed horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let gy = y + 35; gy < y + h - 25; gy += 24) {
      ctx.beginPath();
      ctx.moveTo(x + 16, gy);
      ctx.lineTo(x + w - 16, gy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Elevation Curve Points
    const p0 = { x: x + 20, y: y + h - 34 };
    const p1 = { x: x + w * 0.25, y: y + h * 0.62 };
    const p2 = { x: x + w * 0.58, y: y + 36 };
    const p3 = { x: x + w * 0.82, y: y + h * 0.58 };
    const p4 = { x: x + w - 20, y: y + h - 42 };

    // Fill under curve with Cyan Gradient
    const areaGrad = ctx.createLinearGradient(x, y + 30, x, y + h);
    areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    areaGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = areaGrad;
    ctx.beginPath();
    ctx.moveTo(p0.x, y + h - 20);
    ctx.lineTo(p0.x, p0.y);
    ctx.bezierCurveTo(x + w * 0.12, y + h * 0.75, x + w * 0.18, p1.y, p1.x, p1.y);
    ctx.bezierCurveTo(x + w * 0.38, p1.y - 10, x + w * 0.45, p2.y, p2.x, p2.y);
    ctx.bezierCurveTo(x + w * 0.68, p2.y, x + w * 0.74, p3.y, p3.x, p3.y);
    ctx.bezierCurveTo(x + w * 0.88, p3.y + 10, x + w * 0.94, p4.y, p4.x, p4.y);
    ctx.lineTo(p4.x, y + h - 20);
    ctx.closePath();
    ctx.fill();

    // Glowing Curve Stroke
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(x + w * 0.12, y + h * 0.75, x + w * 0.18, p1.y, p1.x, p1.y);
    ctx.bezierCurveTo(x + w * 0.38, p1.y - 10, x + w * 0.45, p2.y, p2.x, p2.y);
    ctx.bezierCurveTo(x + w * 0.68, p2.y, x + w * 0.74, p3.y, p3.x, p3.y);
    ctx.bezierCurveTo(x + w * 0.88, p3.y + 10, x + w * 0.94, p4.y, p4.x, p4.y);
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    // Dot at peak
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Milestone Badges
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.fillText('▲ 11,440 ft (Peak)', p2.x - 38, p2.y - 8);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('8,200 ft', p0.x, p0.y + 14);
    ctx.fillText('9,600 ft', p4.x - 24, p4.y + 14);

    ctx.restore();
  }

  drawGpsTopoMap(ctx, x, y, w, h, r) {
    ctx.save();
    ctx.beginPath();
    this.roundedRect(ctx, x, y, w, h, r);
    ctx.clip();

    ctx.fillStyle = '#09090b';
    ctx.fillRect(x, y, w, h);

    // Topo Contour Rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let rad = 40; rad < Math.max(w, h); rad += 35) {
      ctx.beginPath();
      ctx.ellipse(x + w * 0.45, y + h * 0.48, rad * 1.2, rad * 0.75, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glowing Neon GPS Route Track
    ctx.strokeStyle = '#0d99ff';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00d2ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(x + 36, y + h * 0.85);
    ctx.bezierCurveTo(x + w * 0.28, y + h * 0.78, x + w * 0.32, y + h * 0.58, x + w * 0.52, y + h * 0.46);
    ctx.bezierCurveTo(x + w * 0.65, y + h * 0.38, x + w * 0.72, y + h * 0.24, x + w * 0.84, y + h * 0.18);
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    // Start Waypoint Pin
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x + 36, y + h * 0.85, 6, 0, Math.PI * 2);
    ctx.fill();

    // User Location Pulsing Beacon
    const beaconX = x + w * 0.52;
    const beaconY = y + h * 0.46;

    // Outer radar wave
    ctx.fillStyle = 'rgba(13, 153, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(beaconX, beaconY, 18, 0, Math.PI * 2);
    ctx.fill();

    // Blue halo
    ctx.fillStyle = '#0d99ff';
    ctx.beginPath();
    ctx.arc(beaconX, beaconY, 8, 0, Math.PI * 2);
    ctx.fill();

    // White core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(beaconX, beaconY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Summit Flag Pin
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x + w * 0.84, y + h * 0.18, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawStatusBarIcons(ctx, frameX, frameY, frameW, frameFill) {
    const isDark = frameFill && (frameFill === '#09090b' || frameFill === '#18181b' || frameFill.includes('09090b') || frameFill.includes('18181b'));
    const color = isDark ? '#ffffff' : '#0f172a';

    const rightX = frameX + frameW - 76;
    const iconY = frameY + 20;

    ctx.save();
    ctx.fillStyle = color;

    // 1. Cellular Signal (4 vertical bars)
    const barWidth = 3;
    const barGap = 2;
    const heights = [4, 6, 8, 10];
    for (let i = 0; i < 4; i++) {
      const bh = heights[i];
      ctx.fillRect(rightX + i * (barWidth + barGap), iconY + (10 - bh), barWidth, bh);
    }

    // 2. Wi-Fi Icon (3 arcs)
    const wifiX = rightX + 24;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(wifiX, iconY + 9, 8, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wifiX, iconY + 9, 5, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wifiX, iconY + 8, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Battery Icon
    const battX = rightX + 42;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    this.roundedRect(ctx, battX, iconY + 1, 20, 10, 3);
    ctx.stroke();

    // Battery terminal nub
    ctx.fillStyle = color;
    ctx.fillRect(battX + 20, iconY + 4, 1.5, 4);

    // Battery green level fill
    ctx.fillStyle = '#22c55e';
    this.roundedRect(ctx, battX + 2, iconY + 3, 14, 6, 1.5);
    ctx.fill();

    ctx.restore();
  }

  drawLayoutGrid(ctx, doc) {
    ctx.save();
    for (const frame of doc.root.children) {
      if (frame.type === 'FRAME') {
        const b = frame.getAbsoluteBounds();
        const cols = 12;
        const margin = 20;
        const gutter = 12;
        const totalGutter = (cols - 1) * gutter;
        const colWidth = (b.width - margin * 2 - totalGutter) / cols;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'; // Light reddish tint matching FigCraft
        for (let i = 0; i < cols; i++) {
          const cx = b.x + margin + i * (colWidth + gutter);
          ctx.fillRect(cx, b.y, colWidth, b.height);
        }
      }
    }
    ctx.restore();
  }

  drawDevAnnotations(ctx, doc) {
    ctx.save();
    // Render "Ready for Dev" badge on frames
    for (const frame of doc.root.children) {
      if (frame.type === 'FRAME') {
        const b = frame.getAbsoluteBounds();

        // Badge pill at top right of frame
        const badgeW = 96 / this.zoom;
        const badgeH = 20 / this.zoom;
        const badgeX = b.right - badgeW - 8 / this.zoom;
        const badgeY = b.y - badgeH - 6 / this.zoom;

        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1 / this.zoom;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10 / this.zoom);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = `600 ${10 / this.zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('● Ready for dev', badgeX + badgeW / 2, badgeY + badgeH / 2);
      }
    }

    // Render Dev Annotation Callout Pin on Cascade Canyon Trail Card
    const target = doc.findNodeByName('Featured Trail Card') || doc.findNodeByName('Hero Banner');
    if (target) {
      const b = target.getAbsoluteBounds();
      const pinX = b.x - 30;
      const pinY = b.y + 40;

      // Callout box
      ctx.fillStyle = '#065f46';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.beginPath();
      ctx.roundRect(pinX - 160 / this.zoom, pinY - 14 / this.zoom, 150 / this.zoom, 28 / this.zoom, 6 / this.zoom);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ecfdf5';
      ctx.font = `bold ${10 / this.zoom}px JetBrains Mono, monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('[DEV #1] TrailCard Props', pinX - 150 / this.zoom, pinY);

      // Connecting pointer line
      ctx.beginPath();
      ctx.moveTo(pinX - 10 / this.zoom, pinY);
      ctx.lineTo(b.x, pinY);
      ctx.strokeStyle = '#34d399';
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCollabPresence(ctx, doc) {
    ctx.save();
    // 1. Priya's Green Selection on Featured Trail Card (Shot-7)
    const featuredCard = doc.findNodeByName('Featured Trail Card') || doc.findNodeByName('Hero Banner');
    if (featuredCard) {
      const b = featuredCard.getAbsoluteBounds();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2 / this.zoom;
      ctx.strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);

      // Tag label
      ctx.fillStyle = '#22c55e';
      ctx.font = `700 ${10 / this.zoom}px Inter, sans-serif`;
      const labelW = 76 / this.zoom;
      const labelH = 18 / this.zoom;
      ctx.fillRect(b.x - 2, b.y - labelH - 2, labelW, labelH);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Priya Nair', b.x - 2 + labelW / 2, b.y - labelH / 2 - 2);
    }

    // 2. Jonas's Purple Cursor & Live Cursor Chat Bubble (Shot-7)
    const cursorX = 720;
    const cursorY = 560;

    // Draw pointer cursor arrow
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / this.zoom;
    ctx.beginPath();
    ctx.moveTo(cursorX, cursorY);
    ctx.lineTo(cursorX, cursorY + 18 / this.zoom);
    ctx.lineTo(cursorX + 5 / this.zoom, cursorY + 14 / this.zoom);
    ctx.lineTo(cursorX + 11 / this.zoom, cursorY + 22 / this.zoom);
    ctx.lineTo(cursorX + 14 / this.zoom, cursorY + 20 / this.zoom);
    ctx.lineTo(cursorX + 8 / this.zoom, cursorY + 12 / this.zoom);
    ctx.lineTo(cursorX + 14 / this.zoom, cursorY + 12 / this.zoom);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Jonas cursor badge
    ctx.fillStyle = '#a855f7';
    const jonasBadgeW = 72 / this.zoom;
    const jonasBadgeH = 16 / this.zoom;
    ctx.fillRect(cursorX + 12 / this.zoom, cursorY + 18 / this.zoom, jonasBadgeW, jonasBadgeH);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${9 / this.zoom}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Jonas Ortiz', cursorX + 12 / this.zoom + jonasBadgeW / 2, cursorY + 18 / this.zoom + jonasBadgeH / 2);

    // Live Cursor Chat Bubble: "Should the Start button stay pinned while scrolling?"
    const chatText = 'Should the Start button stay pinned while scrolling?';
    ctx.font = `500 ${11 / this.zoom}px Inter, sans-serif`;
    const chatW = 270 / this.zoom;
    const chatH = 26 / this.zoom;
    const chatX = cursorX + 14 / this.zoom;
    const chatY = cursorY + 38 / this.zoom;

    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5 / this.zoom;
    ctx.beginPath();
    ctx.roundRect(chatX, chatY, chatW, chatH, 8 / this.zoom);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f4f4f5';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(chatText, chatX + 10 / this.zoom, chatY + chatH / 2);

    ctx.restore();
  }

  drawSmartGuides(ctx) {
    if (!this.activeGuides || this.activeGuides.length === 0) return;
    ctx.save();
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1 / this.zoom;
    ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);

    for (const g of this.activeGuides) {
      ctx.beginPath();
      if (g.type === 'vertical') {
        ctx.moveTo(g.x, -5000);
        ctx.lineTo(g.x, 15000);
      } else {
        ctx.moveTo(-5000, g.y);
        ctx.lineTo(15000, g.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  resolveFillStyle(ctx, fill, absX, absY, width, height) {
    if (!fill) return null;
    if (typeof fill === 'string') return fill;
    if (fill.type === 'gradient') {
      let grad;
      if (fill.kind === 'radial') {
        const fx = absX + (fill.from ? fill.from[0] * width : width / 2);
        const fy = absY + (fill.from ? fill.from[1] * height : height / 2);
        const radius = Math.max(width, height) / 2;
        grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.max(1, radius));
      } else {
        const x1 = absX + (fill.from ? fill.from[0] * width : 0);
        const y1 = absY + (fill.from ? fill.from[1] * height : 0);
        const x2 = absX + (fill.to ? fill.to[0] * width : 0);
        const y2 = absY + (fill.to ? fill.to[1] * height : height);
        grad = ctx.createLinearGradient(x1, y1, x2, y2);
      }
      if (fill.stops && Array.isArray(fill.stops)) {
        for (const stop of fill.stops) {
          const pos = Math.min(1, Math.max(0, stop.position));
          grad.addColorStop(pos, stop.color || 'transparent');
        }
      }
      return grad;
    }
    return null;
  }

  drawStar(ctx, x, y, width, height, points = 5, innerRatio = 0.38, fill = '#f59e0b') {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rOuter = Math.min(width, height) / 2;
    const rInner = rOuter * innerRatio;
    const step = Math.PI / points;

    ctx.save();
    ctx.fillStyle = this.resolveFillStyle(ctx, fill, x, y, width, height) || (typeof fill === 'string' ? fill : '#f59e0b');
    ctx.beginPath();
    for (let i = 0; i < 2 * points; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const angle = i * step - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
