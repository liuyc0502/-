import logging
import os
from typing import Dict, Any

import yaml

LANGUAGE = {
    "ZH": "zh",
    "EN": "en"
}

logger = logging.getLogger("prompt_template_utils")

# Define template path mapping
template_paths = {
    'analyze_image': {
        LANGUAGE["ZH"]: 'core/prompts/analyze_image_zh.yaml',
        LANGUAGE["EN"]: 'core/prompts/analyze_image_en.yaml'
    },
    'analyze_file': {
        LANGUAGE["ZH"]: 'core/prompts/analyze_file_zh.yaml',
        LANGUAGE["EN"]: 'core/prompts/analyze_file_en.yaml'
    }
}

def get_prompt_template(template_type: str, language: str = LANGUAGE["ZH"], **kwargs) -> Dict[str, Any]:
    logger.info(
        f"Getting prompt template for type: {template_type}, language: {language}, kwargs: {kwargs}")

    if template_type not in template_paths:
        raise ValueError(f"Unsupported template type: {template_type}")

    template_path = template_paths[template_type][language]

    current_dir = os.path.dirname(os.path.abspath(__file__))
    core_dir = os.path.dirname(current_dir)
    absolute_template_path = os.path.join(core_dir, template_path.replace('core/', ''))

    with open(absolute_template_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)
