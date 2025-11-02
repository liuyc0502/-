#!/usr/bin/env python3
"""
WebPath HTML to Merged Markdown Converter (Category-based)

This script groups WebPath HTML files by filename prefix and merges them into
category-based knowledge base documents with multi-image annotation support.

Usage:
    python webpath_merge_by_category.py input_folder/ output_folder/
    python webpath_merge_by_category.py --prefix CV input_folder/ output_folder/
"""

import re
import sys
import argparse
from pathlib import Path
from html.parser import HTMLParser
from collections import defaultdict
import logging
import json

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
        self.navigation = {'next': None, 'previous': None, 'index': None}
        self.current_tag = None
        self.in_table = False
        self.current_link_href = None

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.current_tag = tag

        # Extract image URL (prioritize main pathology images)
        if tag == 'img' and 'src' in attrs_dict:
            src = attrs_dict['src']
            skip_patterns = ['/GIFS/', 'arrow', 'fwd', 'back', 'help', 'icon']
            if any(pattern in src for pattern in skip_patterns):
                if self.image_url:
                    return
            if src.startswith('../'):
                self.image_url = f"https://webpath.med.utah.edu/{src.replace('../', '')}"
            elif not src.startswith('http'):
                self.image_url = f"https://webpath.med.utah.edu/{src}"
            else:
                self.image_url = src

        if tag == 'a' and 'href' in attrs_dict:
            href = attrs_dict['href']
            self.current_link_href = href
            if 'onmouseover' in attrs_dict:
                mouseover = attrs_dict['onmouseover']
                coord_match = re.search(r'showArrow\((\d+),\s*(\d+)\)', mouseover)
                if coord_match:
                    x, y = int(coord_match.group(1)), int(coord_match.group(2))
                    self.annotations.append({
                        'term': None,
                        'description': '',
                        'coordinates': {'x': x, 'y': y, 'width': 60, 'height': 40}
                    })

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
        if self.current_tag == 'title' and not self.title:
            self.title = data
        if self.in_table and data:
            self.description_text.append(data)
        if self.current_link_href and self.annotations:
            last_annotation = self.annotations[-1]
            if last_annotation['term'] is None:
                last_annotation['term'] = data
                if self.description_text:
                    desc_snippet = ' '.join(self.description_text)
                    sentences = re.split(r'[.!?]', desc_snippet)
                    for sentence in sentences:
                        if data.lower() in sentence.lower():
                            last_annotation['description'] = sentence.strip()
                            break

    def get_metadata(self):
        """Return extracted metadata as dictionary"""
        case_id = self.title.lower().replace(' ', '_') if self.title else 'webpath_case'
        valid_annotations = [a for a in self.annotations if a['term']]
        return {
            'case_id': case_id,
            'title': self.title or 'WebPath Case',
            'image_url': self.image_url,
            'annotations': valid_annotations,
            'description': ' '.join(self.description_text),
            'navigation': self.navigation
        }


def extract_prefix(filename: str) -> str:
    """
    Extract category prefix from filename

    Examples:
        CV001.html → CV
        ATH042.html → ATH
        RENAL123.html → RENAL
        GI-001.html → GI
    """
    # Remove extension
    name = Path(filename).stem

    # Pattern 1: Letters followed by numbers (CV001, ATH042)
    match = re.match(r'^([A-Z]+)[\d-]', name, re.IGNORECASE)
    if match:
        return match.group(1).upper()

    # Pattern 2: Letters with hyphen (GI-001)
    match = re.match(r'^([A-Z]+)-', name, re.IGNORECASE)
    if match:
        return match.group(1).upper()

    # Pattern 3: All letters before first number
    match = re.match(r'^([A-Za-z]+)', name)
    if match:
        return match.group(1).upper()

    return 'OTHER'


def parse_html_file(html_path: Path) -> dict:
    """Parse a single HTML file and return metadata"""
    try:
        with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
            html_content = f.read()

        parser = WebPathHTMLParser()
        parser.feed(html_content)
        metadata = parser.get_metadata()
        metadata['source_file'] = html_path.name
        return metadata
    except Exception as e:
        logger.error(f"Failed to parse {html_path.name}: {str(e)}")
        return None


def categorize_html_files(input_dir: Path, prefix_filter: str = None) -> dict:
    """
    Categorize HTML files by prefix

    Returns:
        dict: {prefix: [list of parsed metadata]}
    """
    html_files = list(input_dir.glob('*.html')) + list(input_dir.glob('*.htm'))
    categories = defaultdict(list)

    logger.info(f"Found {len(html_files)} HTML files")

    for html_file in html_files:
        prefix = extract_prefix(html_file.name)

        # Apply filter if specified
        if prefix_filter and prefix != prefix_filter.upper():
            continue

        metadata = parse_html_file(html_file)
        if metadata:
            categories[prefix].append(metadata)

    # Sort each category by filename
    for prefix in categories:
        categories[prefix].sort(key=lambda x: x['source_file'])

    return categories


def generate_category_prefix_name(prefix: str) -> str:
    """Generate readable category name from prefix"""
    prefix_map = {
        'CV': 'Cardiovascular',
        'ATH': 'Atherosclerosis',
        'RENAL': 'Kidney',
        'LUNG': 'Pulmonary',
        'GI': 'Gastrointestinal',
        'HEPAT': 'Hepatic',
        'NEURO': 'Neurological',
        'BONE': 'Musculoskeletal',
        'SKIN': 'Dermatological',
        'ENDO': 'Endocrine',
        'REPRO': 'Reproductive',
        'HEME': 'Hematologic',
        'IMM': 'Immunologic',
        'NEO': 'Neoplasm',
    }
    return prefix_map.get(prefix, prefix)


def create_merged_markdown(prefix: str, cases: list) -> str:
    """
    Create merged markdown document for a category

    Args:
        prefix: Category prefix (e.g., 'CV', 'ATH')
        cases: List of case metadata dictionaries

    Returns:
        Formatted markdown string with YAML front matter
    """
    category_name = generate_category_prefix_name(prefix)
    case_id = f"{prefix.lower()}_collection"

    # Build YAML front matter
    yaml_lines = [
        '---',
        f'pathology_case_id: "{case_id}"',
        f'pathology_category: "{category_name}"',
        f'pathology_prefix: "{prefix}"',
        f'total_cases: {len(cases)}',
        'pathology_metadata:',
        '  images:'
    ]

    # Add each case as an image entry
    for idx, case in enumerate(cases, 1):
        image_id = f"{prefix.lower()}_{idx:03d}"

        yaml_lines.append(f'    - image_id: "{image_id}"')
        yaml_lines.append(f'      source_file: "{case["source_file"]}"')

        if case['image_url']:
            yaml_lines.append(f'      image_url: "{case["image_url"]}"')
        else:
            yaml_lines.append(f'      image_url: null')

        yaml_lines.append(f'      case_title: "{case["title"]}"')

        if case['annotations']:
            yaml_lines.append('      annotations:')
            for annotation in case['annotations']:
                yaml_lines.append(f'        - term: "{annotation["term"]}"')
                yaml_lines.append(f'          description: "{annotation["description"]}"')
                yaml_lines.append('          coordinates:')
                yaml_lines.append(f'            x: {annotation["coordinates"]["x"]}')
                yaml_lines.append(f'            y: {annotation["coordinates"]["y"]}')
                yaml_lines.append(f'            width: {annotation["coordinates"]["width"]}')
                yaml_lines.append(f'            height: {annotation["coordinates"]["height"]}')
        else:
            yaml_lines.append('      annotations: []')

    yaml_lines.append('---')
    yaml_lines.append('')

    # Build markdown body
    md_lines = [
        f'# {category_name} Pathology Collection',
        '',
        f'> **Category:** {prefix}  ',
        f'> **Total Cases:** {len(cases)}  ',
        f'> **Knowledge Base:** WebPath Medical Education',
        '',
        '---',
        '',
        '## Overview',
        '',
        f'This document contains {len(cases)} pathology cases related to {category_name.lower()}. ',
        'Each case includes detailed descriptions, high-resolution images, and interactive annotations.',
        '',
        '---',
        ''
    ]

    # Add each case
    for idx, case in enumerate(cases, 1):
        image_id = f"{prefix.lower()}_{idx:03d}"

        md_lines.append(f'## Case {idx}: {case["title"]}')
        md_lines.append('')
        md_lines.append(f'**Image ID:** `{image_id}`  ')
        md_lines.append(f'**Source File:** `{case["source_file"]}`')

        if case['image_url']:
            md_lines.append('')
            md_lines.append(f'![{case["title"]}]({image_id})')

        md_lines.append('')
        md_lines.append('### Description')
        md_lines.append('')
        md_lines.append(case['description'] if case['description'] else '*(No description available)*')
        md_lines.append('')

        # Add annotation terms in markdown
        if case['annotations']:
            md_lines.append('### Key Features')
            md_lines.append('')
            for annotation in case['annotations']:
                term = f"**{annotation['term']}**"
                if annotation['description']:
                    md_lines.append(f"- {term}: {annotation['description']}")
                else:
                    md_lines.append(f"- {term}")
            md_lines.append('')

        md_lines.append('---')
        md_lines.append('')

    # Combine YAML and Markdown
    full_content = '\n'.join(yaml_lines + md_lines)
    return full_content


def process_categories(input_dir: Path, output_dir: Path, prefix_filter: str = None):
    """Process all categories and generate merged markdown files"""
    categories = categorize_html_files(input_dir, prefix_filter)

    if not categories:
        logger.warning("No HTML files found or categorized")
        return

    logger.info(f"Found {len(categories)} categories")

    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate summary
    summary_lines = [
        '# WebPath Conversion Summary',
        '',
        f'**Total Categories:** {len(categories)}  ',
        f'**Total Cases:** {sum(len(cases) for cases in categories.values())}',
        '',
        '## Categories',
        ''
    ]

    for prefix, cases in sorted(categories.items()):
        category_name = generate_category_prefix_name(prefix)
        logger.info(f"Processing {prefix}: {category_name} ({len(cases)} cases)")

        # Generate merged markdown
        markdown_content = create_merged_markdown(prefix, cases)

        # Write to file
        output_file = output_dir / f"{prefix}_{category_name.lower()}.md"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(markdown_content)

        logger.info(f"✓ Created: {output_file.name}")

        # Add to summary
        summary_lines.append(f'- **{prefix}** - {category_name}: {len(cases)} cases → `{output_file.name}`')

    # Write summary file
    summary_file = output_dir / '_CONVERSION_SUMMARY.md'
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(summary_lines))

    logger.info(f"\n{'='*60}")
    logger.info(f"Conversion Complete!")
    logger.info(f"{'='*60}")
    logger.info(f"Categories processed: {len(categories)}")
    logger.info(f"Total cases: {sum(len(cases) for cases in categories.values())}")
    logger.info(f"Output directory: {output_dir}")
    logger.info(f"Summary file: {summary_file.name}")


def main():
    parser = argparse.ArgumentParser(
        description='Merge WebPath HTML files by category prefix',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Convert all categories
  python webpath_merge_by_category.py webpath_html/ webpath_knowledge/

  # Convert only CV (Cardiovascular) category
  python webpath_merge_by_category.py --prefix CV webpath_html/ webpath_knowledge/

  # Convert only ATH (Atherosclerosis) category
  python webpath_merge_by_category.py --prefix ATH webpath_html/ webpath_knowledge/
        '''
    )

    parser.add_argument('input', type=str, help='Input directory containing HTML files')
    parser.add_argument('output', type=str, help='Output directory for merged markdown files')
    parser.add_argument('--prefix', type=str, help='Only process files with this prefix (e.g., CV, ATH)')

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists() or not input_path.is_dir():
        logger.error(f"Input directory does not exist: {input_path}")
        sys.exit(1)

    process_categories(input_path, output_path, args.prefix)


if __name__ == '__main__':
    main()
