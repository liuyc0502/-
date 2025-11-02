import json
import logging
import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import yaml

from smolagents.tools import Tool
from pydantic import Field

from ..utils.observer import MessageObserver, ProcessType
from ..utils.tools_common_message import ToolCategory

logger = logging.getLogger(__name__)


class PathologySearchTool(Tool):
    """
    Pathology knowledge base search tool

    Searches through pathology markdown files and returns matching cases
    with images and anatomical annotations.
    """
    name = "pathology_search"
    description = (
        "Search pathology knowledge base for medical images with anatomical annotations. "
        "Use this tool when users ask about pathological features, anatomical structures, "
        "or want to see medical imaging examples. Returns images with clickable anatomical "
        "terms that show arrows pointing to structures. "
        "Example queries: 'show me normal coronary artery pathology', "
        "'what does bone anatomy look like', 'pathology of heart tissue'"
    )
    inputs = {
        "query": {
            "type": "string",
            "description": "The search query (e.g., 'coronary artery', 'bone anatomy', 'heart pathology')"
        }
    }
    output_type = "string"
    category = ToolCategory.SEARCH.value

    def __init__(
        self,
        pathology_dir: str = Field(description="Directory containing pathology markdown files"),
        top_k: int = Field(description="Maximum number of results", default=3),
        observer: MessageObserver = Field(description="Message observer", default=None, exclude=True)
    ):
        """
        Initialize the PathologySearchTool.

        Args:
            pathology_dir: Path to directory containing pathology MD files
            top_k: Number of results to return
            observer: Message observer instance
        """
        super().__init__()
        self.pathology_dir = pathology_dir
        self.top_k = top_k
        self.observer = observer

        # Cache for parsed pathology data
        self._pathology_cache: Optional[List[Dict[str, Any]]] = None

    def _load_pathology_files(self) -> List[Dict[str, Any]]:
        """
        Load and parse all pathology markdown files.

        Returns:
            List of parsed pathology case dictionaries
        """
        if self._pathology_cache is not None:
            return self._pathology_cache

        pathology_cases = []
        pathology_path = Path(self.pathology_dir)

        if not pathology_path.exists():
            logger.warning(f"Pathology directory not found: {self.pathology_dir}")
            return []

        # Find all markdown files
        md_files = list(pathology_path.glob("**/*.md"))
        logger.info(f"Found {len(md_files)} pathology markdown files")

        for md_file in md_files:
            try:
                case_data = self._parse_pathology_file(md_file)
                if case_data:
                    pathology_cases.extend(case_data)
            except Exception as e:
                logger.error(f"Error parsing {md_file}: {e}")

        self._pathology_cache = pathology_cases
        logger.info(f"Loaded {len(pathology_cases)} pathology cases")
        return pathology_cases

    def _parse_pathology_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """
        Parse a pathology markdown file and extract case data.

        Args:
            file_path: Path to markdown file

        Returns:
            List of case dictionaries with image and annotation data
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract YAML frontmatter
        yaml_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
        if not yaml_match:
            logger.warning(f"No YAML frontmatter found in {file_path}")
            return []

        try:
            metadata = yaml.safe_load(yaml_match.group(1))
        except yaml.YAMLError as e:
            logger.error(f"YAML parsing error in {file_path}: {e}")
            return []

        # Extract case information
        cases = []
        pathology_category = metadata.get('pathology_category', '')
        images_data = metadata.get('pathology_metadata', {}).get('images', [])

        for image_data in images_data:
            case = {
                'file_path': str(file_path),
                'category': pathology_category,
                'image_id': image_data.get('image_id', ''),
                'image_url': image_data.get('image_url', ''),
                'case_title': image_data.get('case_title', ''),
                'description': '',
                'annotations': [],
                'keywords': []
            }

            # Extract annotations
            annotations = image_data.get('annotations', [])
            for ann in annotations:
                # Get description from first annotation if case description is empty
                if not case['description'] and ann.get('description'):
                    case['description'] = ann['description']

                coords = ann.get('coordinates', {})
                if coords and ann.get('term'):
                    case['annotations'].append({
                        'term': ann['term'],
                        'coordinates': {
                            'x': coords.get('x', 0),
                            'y': coords.get('y', 0),
                            'width': coords.get('width', 60),
                            'height': coords.get('height', 40)
                        },
                        'description': ann.get('description', '')
                    })

            # Extract keywords from description or category
            case['keywords'] = self._extract_keywords(case, pathology_category)

            cases.append(case)

        return cases

    def _extract_keywords(self, case: Dict[str, Any], category: str) -> List[str]:
        """
        Extract searchable keywords from case data.

        Args:
            case: Case dictionary
            category: Pathology category

        Returns:
            List of keywords
        """
        keywords = set()

        # Add category
        if category:
            keywords.add(category.lower())

        # Add title words
        if case['case_title']:
            title_words = re.findall(r'\b\w+\b', case['case_title'].lower())
            keywords.update(title_words)

        # Add anatomical terms
        for ann in case['annotations']:
            if ann['term']:
                keywords.add(ann['term'].lower())

        return list(keywords)

    def _search_cases(self, query: str, cases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Search pathology cases by query string.

        Args:
            query: Search query
            cases: List of pathology cases

        Returns:
            Ranked list of matching cases
        """
        query_lower = query.lower()
        query_terms = set(re.findall(r'\b\w+\b', query_lower))

        scored_cases = []

        for case in cases:
            score = 0

            # Exact title match (highest score)
            if query_lower in case['case_title'].lower():
                score += 100

            # Category match
            if query_lower in case['category'].lower():
                score += 50

            # Keyword matches
            keyword_matches = sum(1 for kw in case['keywords'] if kw in query_lower)
            score += keyword_matches * 10

            # Query term matches
            query_term_matches = sum(1 for term in query_terms if term in case['keywords'])
            score += query_term_matches * 5

            # Annotation term matches
            for ann in case['annotations']:
                if query_lower in ann['term'].lower():
                    score += 20

            if score > 0:
                scored_cases.append((score, case))

        # Sort by score descending
        scored_cases.sort(key=lambda x: x[0], reverse=True)

        # Return top_k results
        return [case for score, case in scored_cases[:self.top_k]]

    def forward(self, query: str) -> str:
        """
        Search pathology knowledge base and return matching cases.

        Args:
            query: Search query string

        Returns:
            JSON string containing search results
        """
        logger.info(f"PathologySearchTool called with query: '{query}'")

        # Send tool notification
        if self.observer:
            self.observer.add_message("", ProcessType.TOOL, "Searching pathology knowledge base...")
            card_content = [{"icon": "microscope", "text": query}]
            self.observer.add_message("", ProcessType.CARD, json.dumps(card_content, ensure_ascii=False))

        # Load pathology data
        cases = self._load_pathology_files()

        if not cases:
            error_msg = "No pathology cases found in knowledge base."
            logger.warning(error_msg)
            return json.dumps({"error": error_msg}, ensure_ascii=False)

        # Search for matching cases
        matching_cases = self._search_cases(query, cases)

        if not matching_cases:
            return json.dumps({
                "message": f"No pathology cases found matching '{query}'. Try broader terms like 'anatomy', 'bone', 'heart', etc."
            }, ensure_ascii=False)

        # Format results for frontend
        results = []
        for case in matching_cases:
            # Send pathology_image message type to frontend
            if self.observer:
                pathology_data = {
                    'imageUrl': case['image_url'],
                    'caseTitle': case['case_title'],
                    'caseDescription': case['description'],
                    'annotations': case['annotations'],
                    'keywords': case['keywords']
                }
                self.observer.add_message(
                    "",
                    ProcessType.PATHOLOGY_IMAGE,
                    json.dumps(pathology_data, ensure_ascii=False)
                )

            results.append({
                'title': case['case_title'],
                'category': case['category'],
                'image_url': case['image_url'],
                'annotation_count': len(case['annotations'])
            })

        # Return summary for LLM
        summary = {
            'found': len(results),
            'cases': results
        }

        return json.dumps(summary, ensure_ascii=False)
