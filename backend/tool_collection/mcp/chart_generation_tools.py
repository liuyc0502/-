import json
import logging
from typing import Optional

from fastmcp import FastMCP

logger = logging.getLogger(__name__)

chart_generation_tools = FastMCP("chart_generation")

SUPPORTED_CHART_TYPES = ["bar", "line", "area", "pie", "radar"]


@chart_generation_tools.tool(
    name="generate_chart",
    description=(
        "生成交互式图表。传入数据和配置，返回可由前端渲染的结构化图表 JSON。"
        "支持的图表类型: bar(柱状图), line(折线图), area(面积图), pie(饼图), radar(雷达图)。"
        "使用场景: 检验指标对比、趋势分析、分布展示、多维度评估等。"
        "示例: generate_chart(chart_type='bar', title='血常规指标', "
        "data='[{\"name\":\"WBC\",\"value\":12.5,\"normal_max\":10.0}]', "
        "x_key='name', y_keys='value,normal_max')"
    ),
)
async def generate_chart(
    chart_type: str,
    title: str,
    data: str,
    x_key: str,
    y_keys: str,
    y_labels: Optional[str] = None,
    unit: Optional[str] = None,
    description: Optional[str] = None,
) -> str:
    """
    Generate an interactive chart specification.

    Args:
        chart_type: Chart type - one of: bar, line, area, pie, radar
        title: Chart title
        data: JSON array string of data points, e.g. '[{"name":"A","value":10}]'
        x_key: Key in data objects to use for X axis (or label for pie charts)
        y_keys: Comma-separated keys for Y axis values, e.g. 'value,normal_max'
        y_labels: Optional comma-separated display labels for y_keys, e.g. '实际值,正常上限'
        unit: Optional unit for values, e.g. '10^9/L'
        description: Optional description text shown below the chart

    Returns:
        JSON string with chart specification for frontend rendering
    """
    # Validate chart type
    if chart_type not in SUPPORTED_CHART_TYPES:
        return json.dumps({
            "error": f"Unsupported chart type '{chart_type}'. Supported: {', '.join(SUPPORTED_CHART_TYPES)}"
        }, ensure_ascii=False)

    # Parse data
    try:
        parsed_data = json.loads(data)
        if not isinstance(parsed_data, list):
            return json.dumps({"error": "data must be a JSON array"}, ensure_ascii=False)
    except json.JSONDecodeError as e:
        return json.dumps({"error": f"Invalid JSON in data: {str(e)}"}, ensure_ascii=False)

    # Parse y_keys
    y_key_list = [k.strip() for k in y_keys.split(",") if k.strip()]
    if not y_key_list:
        return json.dumps({"error": "y_keys must contain at least one key"}, ensure_ascii=False)

    # Parse y_labels
    y_label_list = None
    if y_labels:
        y_label_list = [l.strip() for l in y_labels.split(",") if l.strip()]

    # Build chart spec
    chart_spec = {
        "type": "chart",
        "chart_type": chart_type,
        "title": title,
        "data": parsed_data,
        "xKey": x_key,
        "yKeys": y_key_list,
    }

    if y_label_list:
        chart_spec["yLabels"] = y_label_list
    if unit:
        chart_spec["unit"] = unit
    if description:
        chart_spec["description"] = description

    logger.info(f"Generated {chart_type} chart: {title} ({len(parsed_data)} data points)")

    return json.dumps(chart_spec, ensure_ascii=False)
