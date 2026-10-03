// @vitest-environment node
import { expect } from "vitest";
import { spec } from "@/tests/spec";
export const subject = "scripts/render-spec.mjs";
spec(
  "DOC-01",
  "仕様HTMLの生成",
  "2つの見出しと特殊文字を含むMarkdown",
  "1項目1カード、HTMLをescapeし検索可能な独立文書",
  async () => {
    const path = "./render-spec.mjs";
    const { renderSpecification } = await import(path);
    const html = renderSpecification(
      "# Spec\n## A\n- <script>bad</script>\n## B\n- 境界",
    );
    expect((html.match(/<article /g) || []).length).toBe(2);
    expect(html).toContain("&lt;script&gt;bad&lt;/script&gt;");
    expect(html).toContain("data-search=");
    expect(html).toContain('<meta charset="utf-8">');
  },
);

spec(
  "DOC-02",
  "Given・When・Then表の生成",
  "3列の表に特殊文字を含む仕様と対応テスト",
  "列見出し・データ行を表として表示し、区切り行は表示せず文字をescapeする",
  async () => {
    const path = "./render-spec.mjs";
    const { renderSpecification } = await import(path);
    const html = renderSpecification(
      "# Spec\n## 入力\n| Given（前提） | When（操作） | Then（動作） |\n| --- | --- | --- |\n| <input> | 0を入力 | 拒否 & 維持 |\n対応テスト：EDITOR",
    );
    expect(html).toContain('<th scope="col">Given（前提）</th>');
    expect(html).toContain('<th scope="col">When（操作）</th>');
    expect(html).toContain('<th scope="col">Then（動作）</th>');
    expect(html).toContain(
      "<tbody><tr><td>&lt;input&gt;</td><td>0を入力</td><td>拒否 &amp; 維持</td></tr></tbody>",
    );
    expect(html).not.toContain("<td>---</td>");
    expect(html).toContain("<p>対応テスト：EDITOR</p>");
  },
);
