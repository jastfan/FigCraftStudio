/**
 * FigCraft Studio — Persistent Scene Graph & Document Model
 * Complete clean-room implementation of vector design primitives,
 * master components, instances, boolean groups, vector networks, and tokens.
 */

export class BaseNode {
  constructor(type, name = 'Layer') {
    this.id = 'node_' + Math.random().toString(36).substr(2, 9);
    this.type = type;
    this.name = name;
    this.x = 0;
    this.y = 0;
    this.width = 100;
    this.height = 100;
    this.rotation = 0;
    this.opacity = 1.0;
    this.visible = true;
    this.locked = false;

    // Styling
    this.fill = null;
    this.stroke = null;
    this.strokeWidth = 1;
    this.strokeStyle = 'solid'; // 'solid' | 'dashed'
    this.cornerRadius = 0;
    this.effects = []; // [{ type: 'drop-shadow', x: 0, y: 4, blur: 12, color: 'rgba(0,0,0,0.25)' }]

    // Design Tokens / Variable bindings (e.g. { fill: 'var(--color-primary)' })
    this.variableBindings = {};

    // Prototyping
    this.prototypeLink = null; // { targetFrameId: 'node_...', transition: 'instant' | 'slide' }

    // Hierarchy
    this.parent = null;
    this.children = [];
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      right: this.x + this.width,
      bottom: this.y + this.height,
    };
  }

  getAbsoluteBounds() {
    let absX = this.x;
    let absY = this.y;
    let curr = this.parent;
    while (curr && curr.type !== 'DOCUMENT') {
      absX += curr.x;
      absY += curr.y;
      curr = curr.parent;
    }
    return {
      x: absX,
      y: absY,
      width: this.width,
      height: this.height,
      right: absX + this.width,
      bottom: absY + this.height,
    };
  }

  containsPoint(px, py) {
    const b = this.getAbsoluteBounds();
    return px >= b.x && px <= b.right && py >= b.y && py <= b.bottom;
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      child.parent = null;
      this.children.splice(idx, 1);
    }
  }

  clone() {
    const copy = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      JSON.parse(JSON.stringify(this))
    );
    copy.id = 'node_' + Math.random().toString(36).substr(2, 9);
    copy.name = this.name + ' Copy';
    copy.x += 20;
    copy.y += 20;
    copy.children = this.children.map((c) => c.clone());
    copy.children.forEach((c) => (c.parent = copy));
    return copy;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      opacity: this.opacity,
      visible: this.visible,
      locked: this.locked,
      fill: this.fill,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      strokeStyle: this.strokeStyle,
      cornerRadius: this.cornerRadius,
      effects: this.effects,
      variableBindings: this.variableBindings,
      prototypeLink: this.prototypeLink,
      children: this.children.map((c) => c.toJSON()),
    };
  }
}

export class FrameNode extends BaseNode {
  constructor(name = 'Frame', width = 393, height = 852) {
    super('FRAME', name);
    this.width = width;
    this.height = height;
    this.fill = null;
    this.clipContent = true;
    this.cornerRadius = 0;
    this.autoLayout = {
      enabled: false,
      direction: 'VERTICAL', // 'HORIZONTAL' | 'VERTICAL'
      gap: 12,
      paddingTop: 16,
      paddingRight: 16,
      paddingBottom: 16,
      paddingLeft: 16,
      alignItems: 'START', // 'START' | 'CENTER' | 'END'
      justifyContent: 'START', // 'START' | 'CENTER' | 'SPACE_BETWEEN'
    };
  }

  toJSON() {
    const data = super.toJSON();
    data.clipContent = this.clipContent;
    data.autoLayout = this.autoLayout;
    return data;
  }
}

export class RectangleNode extends BaseNode {
  constructor(name = 'Rectangle', width = 120, height = 80) {
    super('RECTANGLE', name);
    this.width = width;
    this.height = height;
    this.fill = '#38bdf8';
  }
}

export class EllipseNode extends BaseNode {
  constructor(name = 'Ellipse', size = 80) {
    super('ELLIPSE', name);
    this.width = size;
    this.height = size;
    this.fill = '#a855f7';
  }
}

export class TextNode extends BaseNode {
  constructor(text = 'Headline Text', name = 'Text') {
    super('TEXT', name);
    this.text = text;
    this.fontSize = 20;
    this.fontWeight = '600';
    this.fontFamily = 'Inter, sans-serif';
    this.textAlign = 'left'; // 'left' | 'center' | 'right'
    this.lineHeight = 1.3;
    this.letterSpacing = 0;
    this.fill = '#f4f4f5';
    this.width = 180;
    this.height = 30;
  }

  toJSON() {
    const data = super.toJSON();
    data.text = this.text;
    data.fontSize = this.fontSize;
    data.fontWeight = this.fontWeight;
    data.fontFamily = this.fontFamily;
    data.textAlign = this.textAlign;
    data.lineHeight = this.lineHeight;
    data.letterSpacing = this.letterSpacing;
    return data;
  }
}

export class VectorNode extends BaseNode {
  constructor(name = 'Vector Path', vertices = []) {
    super('VECTOR', name);
    this.vertices = vertices; // [{ x, y }]
    this.closed = false;
    this.stroke = '#38bdf8';
    this.strokeWidth = 2;
    this.fill = 'transparent';
    this.recomputeBounds();
  }

  recomputeBounds() {
    if (!this.vertices || this.vertices.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of this.vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
    this.x = minX;
    this.y = minY;
    this.width = Math.max(20, maxX - minX);
    this.height = Math.max(20, maxY - minY);
  }

  toJSON() {
    const data = super.toJSON();
    data.vertices = this.vertices;
    data.closed = this.closed;
    return data;
  }
}

export class ComponentNode extends FrameNode {
  constructor(name = 'Component Master', width = 200, height = 60) {
    super(name, width, height);
    this.type = 'COMPONENT';
    this.componentId = 'comp_' + Math.random().toString(36).substr(2, 9);
    this.isMaster = true;
    this.fill = '#18181b';
    this.stroke = '#a855f7';
    this.strokeWidth = 1.5;
  }

  toJSON() {
    const data = super.toJSON();
    data.componentId = this.componentId;
    data.isMaster = this.isMaster;
    return data;
  }
}

export class InstanceNode extends BaseNode {
  constructor(masterComponent, name = null) {
    super('INSTANCE', name || `${masterComponent.name} (Instance)`);
    this.masterComponentId = masterComponent.componentId || masterComponent.id;
    this.width = masterComponent.width;
    this.height = masterComponent.height;
    this.fill = masterComponent.fill;
    this.stroke = masterComponent.stroke;
    this.strokeWidth = masterComponent.strokeWidth;
    this.cornerRadius = masterComponent.cornerRadius;
    this.overrides = {}; // e.g. { text: 'New Text', fill: '#0d99ff' }

    // Deep clone master children as instance children
    for (const child of masterComponent.children) {
      this.addChild(child.clone());
    }
  }

  toJSON() {
    const data = super.toJSON();
    data.masterComponentId = this.masterComponentId;
    data.overrides = this.overrides;
    return data;
  }
}

export class BooleanNode extends BaseNode {
  constructor(name = 'Boolean Group', operation = 'UNION') {
    super('BOOLEAN', name);
    this.booleanOp = operation; // 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'
  }

  toJSON() {
    const data = super.toJSON();
    data.booleanOp = this.booleanOp;
    return data;
  }
}

export class SectionNode extends BaseNode {
  constructor(name = 'Section', width = 800, height = 600) {
    super('SECTION', name);
    this.width = width;
    this.height = height;
    this.fill = 'rgba(255, 255, 255, 0.02)';
    this.stroke = 'rgba(255, 255, 255, 0.15)';
    this.strokeWidth = 1;
    this.strokeStyle = 'dashed';
  }
}

export class StarNode extends BaseNode {
  constructor(name = 'Star', width = 40, height = 40) {
    super('STAR', name);
    this.width = width;
    this.height = height;
    this.points = 5;
    this.innerRatio = 0.38;
    this.fill = '#f59e0b';
  }
}

export class DocumentModel {
  constructor() {
    this.title = 'Untitled Design';
    this.version = '1.0.0';
    this.root = new BaseNode('DOCUMENT', 'Document Root');
    this.root.x = 0;
    this.root.y = 0;
    this.root.width = 0;
    this.root.height = 0;

    // Design Tokens / Variables System
    this.variables = {
      activeMode: 'dark', // 'dark' | 'light'
      modes: ['dark', 'light'],
      colors: {
        '--color-primary': { dark: '#0d99ff', light: '#0284c7' },
        '--color-accent': { dark: '#a855f7', light: '#9333ea' },
        '--color-surface': { dark: '#18181b', light: '#f4f4f5' },
        '--color-bg': { dark: '#09090b', light: '#ffffff' },
        '--color-text': { dark: '#f4f4f5', light: '#09090b' },
        '--color-text-muted': { dark: '#a1a1aa', light: '#71717a' },
      },
      spacing: {
        '--space-xs': '4px',
        '--space-sm': '8px',
        '--space-md': '16px',
        '--space-lg': '24px',
        '--space-xl': '32px',
      },
      radii: {
        '--radius-sm': '6px',
        '--radius-md': '12px',
        '--radius-lg': '20px',
        '--radius-full': '9999px',
      },
    };
  }

  addNode(node, parent = this.root) {
    parent.addChild(node);
    return node;
  }

  deleteNode(node) {
    if (node && node.parent) {
      node.parent.removeChild(node);
    }
  }

  findNodeById(id, current = this.root) {
    if (current.id === id) return current;
    for (const child of current.children) {
      const found = this.findNodeById(id, child);
      if (found) return found;
    }
    return null;
  }

  findNodeByName(name, current = this.root) {
    if (current.name === name) return current;
    for (const child of current.children) {
      const found = this.findNodeByName(name, child);
      if (found) return found;
    }
    return null;
  }

  getAllFrames(current = this.root) {
    let frames = [];
    if (current.type === 'FRAME' || current.type === 'COMPONENT') frames.push(current);
    for (const child of current.children) {
      frames = frames.concat(this.getAllFrames(child));
    }
    return frames;
  }

  getAllComponents(current = this.root) {
    let comps = [];
    if (current.type === 'COMPONENT') comps.push(current);
    for (const child of current.children) {
      comps = comps.concat(this.getAllComponents(child));
    }
    return comps;
  }

  toJSON() {
    return {
      title: this.title,
      version: this.version,
      timestamp: Date.now(),
      variables: this.variables,
      nodes: this.root.children.map((c) => c.toJSON()),
    };
  }

  static fromJSON(json) {
    const doc = new DocumentModel();
    doc.title = json.title || 'Imported Design';
    if (json.variables) {
      doc.variables = json.variables;
    }

    function parseNode(data) {
      let node;
      switch (data.type) {
        case 'FRAME':
          node = new FrameNode(data.name, data.width, data.height);
          node.clipContent = data.clipContent !== undefined ? data.clipContent : true;
          if (data.autoLayout) node.autoLayout = data.autoLayout;
          break;
        case 'COMPONENT':
          node = new ComponentNode(data.name, data.width, data.height);
          node.componentId = data.componentId || ('comp_' + Math.random().toString(36).substr(2, 9));
          node.isMaster = data.isMaster !== undefined ? data.isMaster : true;
          if (data.autoLayout) node.autoLayout = data.autoLayout;
          break;
        case 'INSTANCE':
          node = new BaseNode('INSTANCE', data.name);
          node.masterComponentId = data.masterComponentId;
          node.overrides = data.overrides || {};
          break;
        case 'RECTANGLE':
          node = new RectangleNode(data.name, data.width, data.height);
          break;
        case 'ELLIPSE':
          node = new EllipseNode(data.name, data.width);
          break;
        case 'TEXT':
          node = new TextNode(data.text, data.name);
          node.fontSize = data.fontSize || 16;
          node.fontWeight = data.fontWeight || '400';
          node.fontFamily = data.fontFamily || 'Inter, sans-serif';
          node.textAlign = data.textAlign || 'left';
          node.lineHeight = data.lineHeight || 1.3;
          node.letterSpacing = data.letterSpacing || 0;
          break;
        case 'VECTOR':
          node = new VectorNode(data.name, data.vertices || []);
          node.closed = data.closed || false;
          break;
        case 'BOOLEAN':
          node = new BooleanNode(data.name, data.booleanOp || 'UNION');
          break;
        default:
          node = new BaseNode(data.type, data.name);
      }

      node.id = data.id || node.id;
      node.x = data.x || 0;
      node.y = data.y || 0;
      node.width = data.width || 100;
      node.height = data.height || 100;
      node.rotation = data.rotation || 0;
      node.opacity = data.opacity !== undefined ? data.opacity : 1.0;
      node.visible = data.visible !== undefined ? data.visible : true;
      node.locked = data.locked || false;
      node.fill = data.fill;
      node.stroke = data.stroke;
      node.strokeWidth = data.strokeWidth || 1;
      node.strokeStyle = data.strokeStyle || 'solid';
      node.cornerRadius = data.cornerRadius || 0;
      node.effects = data.effects || [];
      node.variableBindings = data.variableBindings || {};
      node.prototypeLink = data.prototypeLink || null;

      if (data.children && Array.isArray(data.children)) {
        for (const childData of data.children) {
          node.addChild(parseNode(childData));
        }
      }
      return node;
    }

    if (json.nodes && Array.isArray(json.nodes)) {
      for (const nodeData of json.nodes) {
        doc.addNode(parseNode(nodeData));
      }
    }
    return doc;
  }
}
