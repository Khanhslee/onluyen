from pathlib import Path

import pymupdf
import pymupdf4llm


PDF_PATH = Path("NCKH_on_thi.pdf")
OUTPUT_DIR = Path("NCKH_on_thi_markdown")
MARKDOWN_PATH = OUTPUT_DIR / "NCKH_on_thi.md"
IMAGES_DIR = OUTPUT_DIR / "images"
PAGE_RENDER_DIR = OUTPUT_DIR / "pages"


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    IMAGES_DIR.mkdir(exist_ok=True)
    PAGE_RENDER_DIR.mkdir(exist_ok=True)

    with pymupdf.open(PDF_PATH) as document:
        chunks = pymupdf4llm.to_markdown(
            document,
            page_chunks=True,
            write_images=True,
            image_path=str(IMAGES_DIR),
            image_format="png",
            dpi=180,
            margins=(0, 0, 0, 0),
        )

        parts: list[str] = [
            "# NCKH ôn thi",
            "",
            "> Bản chuyển đổi từ `NCKH_on_thi.pdf`. Mỗi trang được giữ lại dưới dạng ảnh "
            "để đối chiếu bố cục, bảng và hình minh họa nguyên bản.",
            "",
        ]

        for page_number, chunk in enumerate(chunks, start=1):
            page = document[page_number - 1]
            page_image = PAGE_RENDER_DIR / f"page-{page_number:02d}.png"
            page.get_pixmap(dpi=180, alpha=False).save(page_image)

            text = chunk["text"].strip()
            text = text.replace("� 15 từ", "≤ 15 từ").replace("�", "→")
            parts.extend(
                [
                    f"## Trang {page_number}",
                    "",
                    f"![Trang {page_number} - bản render nguyên bản](pages/{page_image.name})",
                    "",
                    text,
                    "",
                ]
            )

        MARKDOWN_PATH.write_text("\n".join(parts), encoding="utf-8")

    print(f"Created {MARKDOWN_PATH}")
    print(f"Pages: {len(chunks)}")
    print(f"Extracted images: {len(list(IMAGES_DIR.glob('*')))}")
    print(f"Rendered pages: {len(list(PAGE_RENDER_DIR.glob('*.png')))}")


if __name__ == "__main__":
    main()
