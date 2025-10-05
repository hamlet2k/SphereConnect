import React, { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';

export interface DebugJsonViewerProps {
  value: any;
  style?: CSSProperties;
  className?: string;
  onCopyValue?: (value: string) => void | Promise<void>;
}

type PathSegment = string | number;

const ROOT_PATH = 'root';

const isRecord = (value: unknown): value is Record<string, any> => {
  if (!value) {
    return false;
  }

  const type = typeof value;
  return type === 'object' && !Array.isArray(value);
};

const isExpandable = (value: unknown): value is Record<string, any> | any[] => {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return true;
  }

  return typeof value === 'object';
};

const toPathKey = (segments: PathSegment[]): string => {
  if (segments.length === 0) {
    return ROOT_PATH;
  }

  return [ROOT_PATH, ...segments.map(String)].join('.');
};

const collectExpandablePaths = (value: any, baseSegments: PathSegment[] = []): string[] => {
  const pathKey = toPathKey(baseSegments);

  if (!isExpandable(value)) {
    return [];
  }

  const children: string[] = [pathKey];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      children.push(...collectExpandablePaths(item, [...baseSegments, index]));
    });
  } else {
    Object.entries(value).forEach(([key, child]) => {
      children.push(...collectExpandablePaths(child, [...baseSegments, key]));
    });
  }

  return children;
};

const lineStyleBase: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 6,
  whiteSpace: 'pre',
};

const toggleButtonStyle: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 4,
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(30, 41, 59, 0.6)',
  color: '#E5E7EB',
  fontSize: '0.7rem',
  lineHeight: 1,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

const valueStyle: CSSProperties = {
  color: '#FDE68A',
};

const keyStyle: CSSProperties = {
  color: '#93C5FD',
};

const idValueStyle: CSSProperties = {
  ...valueStyle,
  cursor: 'pointer',
  textDecoration: 'underline dotted',
  borderRadius: 4,
  padding: '0 3px',
};

const toolbarButtonStyle: CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.4)',
  background: 'rgba(30, 41, 59, 0.6)',
  color: '#E5E7EB',
  borderRadius: 6,
  fontSize: '0.7rem',
  padding: '2px 8px',
  cursor: 'pointer',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginBottom: 6,
};

const contentStyle: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  lineHeight: 1.5,
  whiteSpace: 'pre',
  overflowX: 'auto',
};

const formatPrimitive = (value: any): string => {
  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'bigint') {
    return `${value.toString()}n`;
  }

  return String(value);
};

const getSummaryLabel = (value: any): string => {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (isRecord(value)) {
    const keys = Object.keys(value);
    return keys.length > 0 ? `Object {${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''}}` : 'Object { }';
  }

  return typeof value;
};

const DebugJsonViewer: React.FC<DebugJsonViewerProps> = ({ value, style, className, onCopyValue }) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set([ROOT_PATH]));

  useEffect(() => {
    setExpandedPaths(new Set([ROOT_PATH]));
  }, [value]);

  const expandablePaths = useMemo(() => collectExpandablePaths(value), [value]);

  const expandAll = useCallback(() => {
    if (expandablePaths.length === 0) {
      setExpandedPaths(new Set([ROOT_PATH]));
      return;
    }

    setExpandedPaths(new Set(expandablePaths));
  }, [expandablePaths]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set([ROOT_PATH]));
  }, []);

  const handleTogglePath = useCallback((pathKey: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (pathKey === ROOT_PATH) {
        if (next.size > 1) {
          return new Set([ROOT_PATH]);
        }
        next.add(ROOT_PATH);
        return next;
      }

      if (next.has(pathKey)) {
        next.delete(pathKey);
      } else {
        next.add(pathKey);
      }
      return next;
    });
  }, []);

  const handleCopyIdValue = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent, valueToCopy: any) => {
      event.stopPropagation();
      if (!onCopyValue) {
        return;
      }
      const maybePromise = onCopyValue(String(valueToCopy));
      if (maybePromise && typeof (maybePromise as PromiseLike<unknown>).then === 'function') {
        (maybePromise as PromiseLike<unknown>).then(undefined, () => undefined);
      }
    },
    [onCopyValue]
  );

  const renderNode = useCallback(
    (nodeValue: any, segments: PathSegment[], depth: number, keyLabel?: string | number): React.ReactNode => {
      const pathKey = toPathKey(segments);
      const expandable = isExpandable(nodeValue);
      const expanded = expandedPaths.has(pathKey);
      const indentStyle: CSSProperties = {
        ...lineStyleBase,
        paddingLeft: depth === 0 ? 0 : depth * 14,
      };

      const idKey = typeof keyLabel === 'string' && keyLabel.toLowerCase().includes('id');
      const primitiveDisplay = !expandable ? formatPrimitive(nodeValue) : getSummaryLabel(nodeValue);

      const valueNode = !expandable ? (
        idKey && (typeof nodeValue === 'string' || typeof nodeValue === 'number') ? (
          <span
            role="button"
            tabIndex={0}
            style={idValueStyle}
            onClick={(event) => handleCopyIdValue(event, nodeValue)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleCopyIdValue(event, nodeValue);
              }
            }}
            title="Copy ID"
          >
            {primitiveDisplay}
          </span>
        ) : (
          <span style={valueStyle}>{primitiveDisplay}</span>
        )
      ) : (
        <span style={{ color: '#F472B6' }}>{primitiveDisplay}</span>
      );

      return (
        <div key={pathKey}>
          <div
            style={indentStyle}
            role={expandable ? 'button' : undefined}
            tabIndex={expandable ? 0 : undefined}
            onClick={expandable ? () => handleTogglePath(pathKey) : undefined}
            onKeyDown={
              expandable
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleTogglePath(pathKey);
                    }
                  }
                : undefined
            }
          >
            {expandable ? (
              <button
                type="button"
                style={toggleButtonStyle}
                onClick={(event) => {
                  event.stopPropagation();
                  handleTogglePath(pathKey);
                }}
              >
                {expanded ? '−' : '+'}
              </button>
            ) : (
              <span style={{ width: 18 }} />
            )}
            {keyLabel !== undefined && (
              <span style={keyStyle}>
                {typeof keyLabel === 'number' ? `[${keyLabel}]` : `${keyLabel}:`}
              </span>
            )}
            {valueNode}
          </div>
          {expandable && expanded && (
            <div>
              {Array.isArray(nodeValue)
                ? nodeValue.map((child, index) => renderNode(child, [...segments, index], depth + 1, index))
                : Object.entries(nodeValue).map(([childKey, childValue]) =>
                    renderNode(childValue, [...segments, childKey], depth + 1, childKey)
                  )}
            </div>
          )}
        </div>
      );
    },
    [expandedPaths, handleCopyIdValue, handleTogglePath]
  );

  const containerStyle: CSSProperties = {
    ...contentStyle,
    ...style,
  };

  if (value === undefined) {
    return (
      <div className={className} style={containerStyle}>
        <div style={toolbarStyle}>
          <button type="button" style={toolbarButtonStyle} onClick={expandAll}>
            Expand All
          </button>
          <button type="button" style={toolbarButtonStyle} onClick={collapseAll}>
            Collapse All
          </button>
        </div>
        <div style={{ paddingLeft: 2 }}>undefined</div>
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      <div style={toolbarStyle}>
        <button type="button" style={toolbarButtonStyle} onClick={expandAll}>
          Expand All
        </button>
        <button type="button" style={toolbarButtonStyle} onClick={collapseAll}>
          Collapse All
        </button>
      </div>
      {renderNode(value, [], 0)}
    </div>
  );
};

export default DebugJsonViewer;
