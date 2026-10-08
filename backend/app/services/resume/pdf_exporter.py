"""
PDF Exporter Service.

Generates professional, printable, ATS-compliant PDF resumes.
Uses PyMuPDF (fitz) for fast and deterministic rendering.
"""

from typing import Any, Dict, List, Optional
import io
import structlog

log = structlog.get_logger(__name__)


class ResumePDFExporter:
    """
    Renders structured resume JSON into a clean, ATS-compliant PDF document.
    """

    def generate_pdf(self, content: Dict[str, Any], template_id: str = "modern") -> bytes:
        try:
            import fitz  # PyMuPDF
            doc = fitz.open()
            page = doc.new_page(width=595, height=842)  # A4: 595 x 842 pt
            
            # Setup coordinates and styling
            margin_x = 40
            margin_y = 40
            curr_y = margin_y
            page_width = 595 - (2 * margin_x)
            
            # Colors
            if template_id == "minimal":
                primary_color = (0.1, 0.1, 0.1)
                accent_color = (0.3, 0.3, 0.3)
            elif template_id == "technical":
                primary_color = (0.05, 0.2, 0.4)
                accent_color = (0.1, 0.4, 0.6)
            elif template_id == "academic":
                primary_color = (0.2, 0.1, 0.3)
                accent_color = (0.35, 0.2, 0.45)
            else:  # Modern
                primary_color = (0.15, 0.35, 0.65)
                accent_color = (0.25, 0.45, 0.75)
            
            text_dark = (0.12, 0.12, 0.15)
            text_mid = (0.35, 0.35, 0.4)
            line_color = (0.85, 0.85, 0.88)

            header = content.get("header", {})
            full_name = header.get("full_name", "Kareer Kranti Candidate")
            target_title = header.get("target_title", "Software Engineer")
            email = header.get("email", "")
            phone = header.get("phone", "")
            location = header.get("location", "")
            github = header.get("github", "")
            linkedin = header.get("linkedin", "")

            # Header rendering
            page.insert_text((margin_x, curr_y + 18), full_name, fontsize=20, fontname="helv", fontfile=None, color=primary_color)
            curr_y += 24
            
            page.insert_text((margin_x, curr_y + 11), target_title.upper(), fontsize=10, fontname="helv", fontfile=None, color=accent_color)
            curr_y += 16

            contacts = [c for c in [email, phone, location, github, linkedin] if c]
            contact_line = "  •  ".join(contacts)
            page.insert_text((margin_x, curr_y + 9), contact_line, fontsize=8.5, fontname="helv", fontfile=None, color=text_mid)
            curr_y += 18

            # Divider line
            page.draw_line((margin_x, curr_y), (margin_x + page_width, curr_y), color=line_color, width=1.0)
            curr_y += 14

            def draw_section_heading(title: str):
                nonlocal curr_y
                curr_y += 6
                page.insert_text((margin_x, curr_y + 11), title.upper(), fontsize=11, fontname="helv", fontfile=None, color=primary_color)
                curr_y += 14
                page.draw_line((margin_x, curr_y), (margin_x + page_width, curr_y), color=line_color, width=0.75)
                curr_y += 10

            # 1. Summary
            summary = content.get("summary", "")
            if summary:
                draw_section_heading("Professional Summary")
                # Wrap text simply
                words = summary.split()
                line = ""
                for w in words:
                    test_line = f"{line} {w}".strip()
                    if len(test_line) > 95:
                        page.insert_text((margin_x, curr_y + 9), line, fontsize=9, fontname="helv", fontfile=None, color=text_dark)
                        curr_y += 13
                        line = w
                    else:
                        line = test_line
                if line:
                    page.insert_text((margin_x, curr_y + 9), line, fontsize=9, fontname="helv", fontfile=None, color=text_dark)
                    curr_y += 16

            # 2. Skills
            skills = content.get("skills", [])
            categorized = content.get("categorized_skills", {})
            if categorized or skills:
                draw_section_heading("Technical Skills")
                if categorized:
                    for cat_name, s_list in categorized.items():
                        s_names = ", ".join(s.get("name", "") for s in s_list)
                        line_text = f"{cat_name}: {s_names}"
                        page.insert_text((margin_x, curr_y + 9), line_text, fontsize=9, fontname="helv", fontfile=None, color=text_dark)
                        curr_y += 13
                else:
                    s_names = ", ".join(s.get("name", "") for s in skills)
                    page.insert_text((margin_x, curr_y + 9), s_names, fontsize=9, fontname="helv", fontfile=None, color=text_dark)
                    curr_y += 13
                curr_y += 6

            # 3. Projects
            projects = content.get("projects", [])
            if projects:
                draw_section_heading("Key Technical Projects")
                for p in projects[:3]:
                    p_name = p.get("name", "")
                    p_techs = ", ".join(p.get("technologies", []))
                    p_header = f"{p_name}" + (f" | {p_techs}" if p_techs else "")
                    page.insert_text((margin_x, curr_y + 10), p_header, fontsize=9.5, fontname="helv", fontfile=None, color=text_dark)
                    curr_y += 14
                    
                    for b in p.get("bullets", [])[:2]:
                        words = b.split()
                        line = "• "
                        for w in words:
                            test_line = f"{line} {w}".strip()
                            if len(test_line) > 92:
                                page.insert_text((margin_x + 8, curr_y + 8), line, fontsize=8.5, fontname="helv", fontfile=None, color=text_dark)
                                curr_y += 12
                                line = "  " + w
                            else:
                                line = test_line
                        if line:
                            page.insert_text((margin_x + 8, curr_y + 8), line, fontsize=8.5, fontname="helv", fontfile=None, color=text_dark)
                            curr_y += 13
                    curr_y += 4

            # 4. Education
            education = content.get("education", [])
            if education:
                draw_section_heading("Education")
                for edu in education[:2]:
                    inst = edu.get("institution", "")
                    deg = edu.get("degree", "")
                    dates = f"{edu.get('start_date', '')} - {edu.get('end_date', '')}"
                    page.insert_text((margin_x, curr_y + 9), f"{deg} — {inst}", fontsize=9, fontname="helv", fontfile=None, color=text_dark)
                    page.insert_text((margin_x + page_width - 80, curr_y + 9), dates, fontsize=8.5, fontname="helv", fontfile=None, color=text_mid)
                    curr_y += 14

            # 5. Certifications & Evidence Badges
            certifications = content.get("certifications", [])
            if certifications:
                draw_section_heading("Verifications & Certifications")
                for cert in certifications[:2]:
                    c_name = cert.get("name", "")
                    c_issuer = cert.get("issuer", "")
                    page.insert_text((margin_x, curr_y + 9), f"✓ {c_name} — {c_issuer}", fontsize=8.5, fontname="helv", fontfile=None, color=text_dark)
                    curr_y += 13

            # Footer
            footer_text = "Generated by Kareer Kranti Evidence-Aware Resume Engine • Verified Proof of Work"
            page.insert_text((margin_x, 820), footer_text, fontsize=7.5, fontname="helv", fontfile=None, color=text_mid)

            buf = io.BytesIO()
            doc.save(buf)
            doc.close()
            return buf.getvalue()
        except Exception as exc:
            log.error("Failed to generate PDF", error=str(exc))
            # Minimal fallback text
            return b"%PDF-1.4 Minimal Fallback Kareer Kranti Resume PDF"
