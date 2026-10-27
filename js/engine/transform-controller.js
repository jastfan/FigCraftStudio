/**
 * FigCraft Studio — Transform & Interaction Controller
 * Handles mouse picking, multi-selection, 8-handle resizing,
 * Vector Pen tool anchor points, and smart distance redlines.
 */

import { FrameNode, RectangleNode, EllipseNode, TextNode, VectorNode } from './scene-graph.js';

export class TransformController {
  constructor(renderer, doc) {
    this.renderer = renderer;
    this.doc = doc;

    this.selectedNodes = [];
    this.hoveredNode = null;

    // Interaction Modes: 'IDLE' | 'DRAGGING' | 'RESIZING' | 'PANNING' | 'CREATING' | 'PEN_DRAWING' | 'CONNECTING_PROTOTYPE'
    this.state = 'IDLE';
    this.activeHandle = null;
    this.creationType = null; // 'FRAME' | 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'PEN'

    // Mouse drag state
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialBounds = new Map(); // node -> { x, y, width, height }

    // Prototype link drag
    this.connectingSourceNode = null;

    // Callbacks
    this.onSelectionChange = null;
    this.onDocumentModified = null;
  }

  setSelection(nodes) {
    this.selectedNodes = Array.isArray(nodes) ? nodes : (nodes ? [nodes] : []);
    if (this.onSelectionChange) {
      this.onSelectionChange(this.selectedNodes);
    }
  }

  handleMouseDown(e) {
    const mouseWorld = this.renderer.screenToWorld(e.clientX, e.clientY);
    this.dragStartX = mouseWorld.x;
    this.dragStartY = mouseWorld.y;

    // 1. Check Spacebar or Middle Click -> Hand Pan
    if (e.spaceKey || e.button === 1) {
      this.state = 'PANNING';
      this.lastPanScreenX = e.clientX;
      this.lastPanScreenY = e.clientY;
      return;
    }

    // 2. Check Pen Tool Drawing Mode
    if (this.creationType === 'PEN') {
      const pts = this.renderer.activePenPoints;
      // If clicking near first point, close path
      if (pts.length > 2) {
        const first = pts[0];
        const dist = Math.hypot(mouseWorld.x - first.x, mouseWorld.y - first.y);
        if (dist <= 10 / this.renderer.zoom) {
          this.finishPenDrawing(true);
          return;
        }
      }
      pts.push({ x: mouseWorld.x, y: mouseWorld.y });
      this.state = 'PEN_DRAWING';
      return;
    }

    // 3. Check Shape Creation Mode
    if (this.creationType && this.creationType !== 'PEN') {
      this.state = 'CREATING';
      return;
    }

    // 4. Check Prototyping Hotspot Handle (in Prototype Mode)
    if (this.renderer.mode === 'prototype' && this.selectedNodes.length === 1) {
      const b = this.selectedNodes[0].getAbsoluteBounds();
      const protoHandleX = b.right + 12 / this.renderer.zoom;
      const protoHandleY = b.y + b.height / 2;
      const dist = Math.hypot(mouseWorld.x - protoHandleX, mouseWorld.y - protoHandleY);
      if (dist <= 10 / this.renderer.zoom) {
        this.state = 'CONNECTING_PROTOTYPE';
        this.connectingSourceNode = this.selectedNodes[0];
        return;
      }
    }

    // 5. Check Resize Handle on Selected Nodes
    if (this.selectedNodes.length === 1) {
      const handle = this.hitTestHandles(this.selectedNodes[0], mouseWorld.x, mouseWorld.y);
      if (handle) {
        this.state = 'RESIZING';
        this.activeHandle = handle;
        const b = this.selectedNodes[0].getBounds();
        this.initialBounds.set(this.selectedNodes[0], { ...b });
        return;
      }
    }

    // 6. Hit Test Nodes on Canvas (Pick top-most child first)
    const hit = this.hitTestScene(this.doc.root, mouseWorld.x, mouseWorld.y);
    if (hit && hit !== this.doc.root) {
      if (e.shiftKey) {
        if (this.selectedNodes.includes(hit)) {
          this.setSelection(this.selectedNodes.filter((n) => n !== hit));
        } else {
          this.setSelection([...this.selectedNodes, hit]);
        }
      } else {
        if (!this.selectedNodes.includes(hit)) {
          this.setSelection([hit]);
        }
      }

      this.state = 'DRAGGING';
      this.initialBounds.clear();
      for (const node of this.selectedNodes) {
        this.initialBounds.set(node, { x: node.x, y: node.y, width: node.width, height: node.height });
      }
    } else {
      // Clicked on empty canvas
      if (!e.shiftKey) {
        this.setSelection([]);
      }
    }
  }

  handleMouseMove(e) {
    const mouseWorld = this.renderer.screenToWorld(e.clientX, e.clientY);

    // Pen tool hover tracking
    if (this.creationType === 'PEN') {
      this.renderer.activePenCursor = { x: mouseWorld.x, y: mouseWorld.y };
    }

    if (this.state === 'PANNING') {
      const dx = e.clientX - this.lastPanScreenX;
      const dy = e.clientY - this.lastPanScreenY;
      this.renderer.panX += dx;
      this.renderer.panY += dy;
      this.lastPanScreenX = e.clientX;
      this.lastPanScreenY = e.clientY;
      return;
    }

    if (this.state === 'DRAGGING') {
      const dx = mouseWorld.x - this.dragStartX;
      const dy = mouseWorld.y - this.dragStartY;

      // Smart Alignment Guides
      this.renderer.activeGuides = [];
      const snapThreshold = 6 / this.renderer.zoom;

      for (const node of this.selectedNodes) {
        const init = this.initialBounds.get(node);
        if (init) {
          let newX = Math.round(init.x + dx);
          let newY = Math.round(init.y + dy);

          // Test snap against other nodes
          for (const other of this.doc.root.children) {
            if (other === node) continue;
            const ob = other.getBounds();
            // Snap Left to Left
            if (Math.abs(newX - ob.x) < snapThreshold) {
              newX = ob.x;
              this.renderer.activeGuides.push({ type: 'vertical', x: ob.x });
            }
            // Snap Top to Top
            if (Math.abs(newY - ob.y) < snapThreshold) {
              newY = ob.y;
              this.renderer.activeGuides.push({ type: 'horizontal', y: ob.y });
            }
          }

          node.x = newX;
          node.y = newY;
        }
      }
      return;
    }

    if (this.state === 'RESIZING') {
      const node = this.selectedNodes[0];
      const init = this.initialBounds.get(node);
      const dx = mouseWorld.x - this.dragStartX;
      const dy = mouseWorld.y - this.dragStartY;

      if (this.activeHandle.includes('e')) {
        node.width = Math.max(10, Math.round(init.width + dx));
      }
      if (this.activeHandle.includes('s')) {
        node.height = Math.max(10, Math.round(init.height + dy));
      }
      if (this.activeHandle.includes('w')) {
        const newW = Math.max(10, Math.round(init.width - dx));
        node.x = init.x + (init.width - newW);
        node.width = newW;
      }
      if (this.activeHandle.includes('n')) {
        const newH = Math.max(10, Math.round(init.height - dy));
        node.y = init.y + (init.height - newH);
        node.height = newH;
      }
      return;
    }

    // Hover state update
    if (this.state === 'IDLE') {
      const hit = this.hitTestScene(this.doc.root, mouseWorld.x, mouseWorld.y);
      this.hoveredNode = hit && hit !== this.doc.root ? hit : null;
    }
  }

  handleMouseUp(e) {
    const mouseWorld = this.renderer.screenToWorld(e.clientX, e.clientY);

    if (this.state === 'CREATING' && this.creationType && this.creationType !== 'PEN') {
      const width = Math.max(60, Math.abs(mouseWorld.x - this.dragStartX));
      const height = Math.max(40, Math.abs(mouseWorld.y - this.dragStartY));
      const x = Math.min(this.dragStartX, mouseWorld.x);
      const y = Math.min(this.dragStartY, mouseWorld.y);

      let newNode;
      switch (this.creationType) {
        case 'FRAME':
          newNode = new FrameNode('Frame', width, height);
          break;
        case 'RECTANGLE':
          newNode = new RectangleNode('Rectangle', width, height);
          break;
        case 'ELLIPSE':
          newNode = new EllipseNode('Ellipse', Math.min(width, height));
          break;
        case 'TEXT':
          newNode = new TextNode('Type something...', 'Text');
          break;
      }

      if (newNode) {
        newNode.x = Math.round(x);
        newNode.y = Math.round(y);
        this.doc.addNode(newNode);
        this.setSelection([newNode]);
      }

      this.creationType = null;
    }

    if (this.state === 'CONNECTING_PROTOTYPE' && this.connectingSourceNode) {
      const target = this.hitTestScene(this.doc.root, mouseWorld.x, mouseWorld.y);
      let targetFrame = target;
      while (targetFrame && targetFrame.type !== 'FRAME' && targetFrame.parent) {
        targetFrame = targetFrame.parent;
      }

      if (targetFrame && targetFrame.type === 'FRAME' && targetFrame !== this.connectingSourceNode) {
        this.connectingSourceNode.prototypeLink = {
          targetFrameId: targetFrame.id,
          transition: 'instant',
        };
      }
      this.connectingSourceNode = null;
    }

    this.renderer.activeGuides = [];
    if (this.state !== 'PEN_DRAWING') {
      this.state = 'IDLE';
    }
    this.activeHandle = null;

    if (this.onDocumentModified) {
      this.onDocumentModified();
    }
  }

  finishPenDrawing(closed = false) {
    const pts = this.renderer.activePenPoints;
    if (pts.length >= 2) {
      const vecNode = new VectorNode('Vector Path', [...pts]);
      vecNode.closed = closed;
      this.doc.addNode(vecNode);
      this.setSelection([vecNode]);
    }
    this.renderer.activePenPoints = [];
    this.renderer.activePenCursor = null;
    this.creationType = null;
    this.state = 'IDLE';
    if (this.onDocumentModified) {
      this.onDocumentModified();
    }
  }

  hitTestHandles(node, wx, wy) {
    const b = node.getAbsoluteBounds();
    const handleThreshold = 8 / this.renderer.zoom;

    const handles = [
      { id: 'nw', x: b.x, y: b.y },
      { id: 'n', x: b.x + b.width / 2, y: b.y },
      { id: 'ne', x: b.right, y: b.y },
      { id: 'e', x: b.right, y: b.y + b.height / 2 },
      { id: 'se', x: b.right, y: b.bottom },
      { id: 's', x: b.x + b.width / 2, y: b.bottom },
      { id: 'sw', x: b.x, y: b.bottom },
      { id: 'w', x: b.x, y: b.y + b.height / 2 },
    ];

    for (const h of handles) {
      if (Math.hypot(wx - h.x, wy - h.y) <= handleThreshold) {
        return h.id;
      }
    }
    return null;
  }

  hitTestScene(node, wx, wy) {
    if (node !== this.doc.root && (!node.visible || node.locked)) return null;

    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (!child.visible || child.locked) continue;
      const hit = this.hitTestScene(child, wx, wy);
      if (hit) return hit;
    }

    if (node !== this.doc.root && node.containsPoint(wx, wy)) {
      return node;
    }
    return null;
  }
}
