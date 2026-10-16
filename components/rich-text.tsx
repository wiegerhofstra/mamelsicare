import { Fragment, type ReactNode } from "react";
import { CmsImage } from "./cms-image";
import {
  isAssetId,
  record,
  safeHref,
  text,
  type CmsImage as ImageData,
  type ContentNode,
} from "@/lib/cms/content";

function render(node: ContentNode, key: number): ReactNode {
  const children = node.content.map(render);
  const attrs = node.attrs;
  const bounded = (value: unknown, max: number, fallback: number) =>
    typeof value === "number" && value >= 1 && value <= max ? value : fallback;
  if (node.type === "text") {
    let output: ReactNode = node.text;
    for (const mark of node.marks) {
      switch (mark.type) {
        case "bold":
          output = <strong>{output}</strong>;
          break;
        case "italic":
          output = <em>{output}</em>;
          break;
        case "strike":
          output = <s>{output}</s>;
          break;
        case "underline":
          output = <u>{output}</u>;
          break;
        case "code":
          output = <code>{output}</code>;
          break;
        case "link": {
          // Imported CMS links sometimes contain email text but no href.
          const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(node.text ?? "")
            ? `mailto:${node.text}`
            : null;
          const href = safeHref(mark.attrs.href) ?? email;
          if (href) output = <a href={href}>{output}</a>;
        }
      }
    }
    return <Fragment key={key}>{output}</Fragment>;
  }
  switch (node.type) {
    case "paragraph":
      return children.length ? <p key={key}>{children}</p> : null;
    case "heading": {
      const Tag = `h${Math.max(2, bounded(attrs.level, 6, 2))}` as
        "h2" | "h3" | "h4" | "h5" | "h6";
      return <Tag key={key}>{children}</Tag>;
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={bounded(attrs.start, 1000000, 1)}>
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      );
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    case "table":
      return (
        <div className="table-scroll" key={key}>
          <table>
            <tbody>{children}</tbody>
          </table>
        </div>
      );
    case "tableRow":
      return <tr key={key}>{children}</tr>;
    case "tableCell":
    case "tableHeader": {
      const Tag = node.type === "tableHeader" ? "th" : "td";
      return (
        <Tag
          key={key}
          colSpan={bounded(attrs.colspan, 100, 1)}
          rowSpan={bounded(attrs.rowspan, 100, 1)}
        >
          {children}
        </Tag>
      );
    }
    case "asset": {
      const asset = record(attrs.asset);
      if (!isAssetId(asset.id)) return null;
      if (asset.image)
        return (
          <figure key={key}>
            <CmsImage
              image={asset.image as ImageData}
              sizes="(max-width: 800px) 100vw, 750px"
            />
          </figure>
        );
      return (
        <p key={key}>
          <a href={`/media/${asset.id}`}>
            {text(asset.originalName) || "Download document"}
          </a>
        </p>
      );
    }
    default:
      return <Fragment key={key}>{children}</Fragment>;
  }
}

export function RichText({
  nodes,
  className = "",
}: {
  nodes: ContentNode[];
  className?: string;
}) {
  return <div className={`prose ${className}`}>{nodes.map(render)}</div>;
}
