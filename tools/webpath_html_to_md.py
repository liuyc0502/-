#!/usr/bin/env python3
"""
WebPath HTML to Markdown Converter with Pathology Metadata

This script converts WebPath HTML files to Markdown format with YAML front matter
containing pathology metadata for interactive image annotations.

Usage:
    python webpath_html_to_md.py input.html output.md
    python webpath_html_to_md.py --batch input_folder/ output_folder/
"""

import re
import sys
import argparse
from pathlib import Path
from html.parser import HTMLParser
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


class WebPathHTMLParser(HTMLParser):
    """Parse WebPath HTML files to extract pathology content and annotations"""

    def __init__(self):
        super().__init__()
        self.image_url = None
        self.annotations = []
        self.title = None
        self.description_text = []
        self.navigation = {
            'next': None,
            'previous': None,
            'index': None
        }
        self.current_tag = None
        self.in_table = False
        self.current_link_href = None

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.current_tag = tag

        # Extract image URL (prioritize main pathology images)
        if tag == 'img' and 'src' in attrs_dict:
            src = attrs_dict['src']

            # Skip navigation icons and small UI elements
            skip_patterns = ['/GIFS/', 'arrow', 'fwd', 'back', 'help', 'icon']
            if any(pattern in src for pattern in skip_patterns):
                # Don't overwrite existing main image with UI elements
                if self.image_url:
                    return

            # Convert relative path to absolute URL
            if src.startswith('../'):
                self.image_url = f"https://webpath.med.utah.edu/{src.replace('../', '')}"
            elif not src.startswith('http'):
                self.image_url = f"https://webpath.med.utah.edu/{src}"
            else:
                self.image_url = src

        # Extract navigation links
        if tag == 'a' and 'href' in attrs_dict:
            href = attrs_dict['href']
            self.current_link_href = href

            # Detect navigation patterns
            if 'ATH' in href or 'CV' in href or 'IDX' in href:
                if attrs_dict.get('style') == 'float:right':
                    self.navigation['next'] = href
                elif attrs_dict.get('style') == 'float:left':
                    self.navigation['previous'] = href
                elif 'margin:0 auto' in attrs_dict.get('style', ''):
                    self.navigation['index'] = href

            # Extract annotations with mouse events
            if 'onmouseover' in attrs_dict:
                mouseover = attrs_dict['onmouseover']
                # Extract coordinates from showArrow(x, y)
                coord_match = re.search(r'showArrow\((\d+),\s*(\d+)\)', mouseover)
                if coord_match:
                    x, y = int(coord_match.group(1)), int(coord_match.group(2))
                    # Store temporarily, will get term text in handle_data
                    self.annotations.append({
                        'term': None,
                        'description': '',
                        'coordinates': {'x': x, 'y': y, 'width': 60, 'height': 40}
                    })

        # Detect table containing description
        if tag == 'table' and 'style' in attrs_dict:
            if 'max-width' in attrs_dict['style'].lower():
                self.in_table = True

    def handle_endtag(self, tag):
        if tag == 'table':
            self.in_table = False
        self.current_tag = None

    def handle_data(self, data):
        data = data.strip()
        if not data:
            return

        # Extract title from <TITLE> tag
        if self.current_tag == 'title' and not self.title:
            self.title = data

        # Extract description from table
        if self.in_table and data:
            self.description_text.append(data)

        # Fill in annotation term if we're inside a link with coordinates
        if self.current_link_href and self.annotations:
            last_annotation = self.annotations[-1]
            if last_annotation['term'] is None:
                last_annotation['term'] = data
                # Use the description text as annotation description
                if self.description_text:
                    desc_snippet = ' '.join(self.description_text)
                    # Extract sentence containing the term
                    sentences = re.split(r'[.!?]', desc_snippet)
                    for sentence in sentences:
                        if data.lower() in sentence.lower():
                            last_annotation['description'] = sentence.strip()
                            break

    def get_metadata(self):
        """Return extracted metadata as dictionary"""
        # Generate case ID from title
        case_id = self.title.lower().replace(' ', '_') if self.title else 'webpath_case'

        # Clean up annotations - remove any with None term
        valid_annotations = [a for a in self.annotations if a['term']]

        return {
            'case_id': case_id,
            'title': self.title or 'WebPath Case',
            'image_url': self.image_url,
            'annotations': valid_annotations,
            'description': ' '.join(self.description_text),
            'navigation': self.navigation
        }


def html_to_markdown(html_content: str, output_path: Path = None) -> str:
    """
    Convert WebPath HTML to Markdown with YAML front matter

    Args:
        html_content: Raw HTML content string
        output_path: Optional output path (used for generating case ID)

    Returns:
        Formatted markdown string with YAML front matter
    """
    parser = WebPathHTMLParser()
    parser.feed(html_content)
    metadata = parser.get_metadata()

    # Generate case ID from filename if available
    if output_path:
        case_id = output_path.stem.lower().replace(' ', '_')
    else:
        case_id = metadata['case_id']

    # Build YAML front matter
    yaml_lines = [
        '---',
        f'pathology_case_id: "{case_id}"',
        'pathology_metadata:',
        f'  image_url: "{metadata["image_url"]}"',
        '  annotations:'
    ]

    # Add annotations
    for annotation in metadata['annotations']:
        yaml_lines.extend([
            f'    - term: "{annotation["term"]}"',
            f'      description: "{annotation["description"]}"',
            '      coordinates:',
            f'        x: {annotation["coordinates"]["x"]}',
            f'        y: {annotation["coordinates"]["y"]}',
            f'        width: {annotation["coordinates"]["width"]}',
            f'        height: {annotation["coordinates"]["height"]}'
        ])

    # Add navigation
    if any(metadata['navigation'].values()):
        yaml_lines.append('webpath_navigation:')
        for key, value in metadata['navigation'].items():
            if value:
                yaml_lines.append(f'  {key}: "{value}"')

    yaml_lines.append('---')
    yaml_lines.append('')

    # Build markdown body
    title = metadata['title']
    description = metadata['description']

    md_lines = [
        f'## {title}',
        '',
        '### WebPath Case Description',
        '',
        description,
        '',
        '### Clinical Significance',
        '',
        '**Key Features:**',
        '- (Add clinical features here)',
        '',
        '### Pathophysiology Notes',
        '',
        '(Add detailed pathophysiology notes here)',
        '',
        f'**WebPath Reference:** {case_id}',
    ]

    # Combine YAML and Markdown
    full_content = '\n'.join(yaml_lines + md_lines)
    return full_content


def convert_file(input_path: Path, output_path: Path):
    """Convert a single HTML file to Markdown"""
    try:
        logger.info(f"Converting: {input_path.name} → {output_path.name}")

        with open(input_path, 'r', encoding='utf-8', errors='ignore') as f:
            html_content = f.read()

        markdown_content = html_to_markdown(html_content, output_path)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)

        logger.info(f"✓ Created: {output_path}")
        return True

    except Exception as e:
        logger.error(f"✗ Failed to convert {input_path.name}: {str(e)}")
        return False


def batch_convert(input_dir: Path, output_dir: Path):
    """Batch convert all HTML files in a directory"""
    html_files = list(input_dir.glob('*.html')) + list(input_dir.glob('*.htm'))

    if not html_files:
        logger.warning(f"No HTML files found in {input_dir}")
        return

    logger.info(f"Found {len(html_files)} HTML files to convert")

    success_count = 0
    for html_file in html_files:
        output_file = output_dir / (html_file.stem + '.md')
        if convert_file(html_file, output_file):
            success_count += 1

    logger.info(f"\nConversion complete: {success_count}/{len(html_files)} files succeeded")


def main():
    parser = argparse.ArgumentParser(
        description='Convert WebPath HTML files to Markdown with pathology metadata',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Convert single file
  python webpath_html_to_md.py CV016.html output.md

  # Batch convert directory
  python webpath_html_to_md.py --batch webpath_html/ webpath_md/
        '''
    )

    parser.add_argument('input', type=str, help='Input HTML file or directory')
    parser.add_argument('output', type=str, help='Output Markdown file or directory')
    parser.add_argument('--batch', action='store_true', help='Batch convert all HTML files in input directory')

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        logger.error(f"Input path does not exist: {input_path}")
        sys.exit(1)

    if args.batch:
        if not input_path.is_dir():
            logger.error(f"Input must be a directory for batch mode: {input_path}")
            sys.exit(1)
        batch_convert(input_path, output_path)
    else:
        if input_path.is_dir():
            logger.error(f"Input must be a file (use --batch for directories): {input_path}")
            sys.exit(1)
        convert_file(input_path, output_path)


if __name__ == '__main__':
    main()
