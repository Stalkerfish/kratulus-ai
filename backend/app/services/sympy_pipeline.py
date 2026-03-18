from __future__ import annotations

from typing import Any

try:
    from latex2sympy2 import latex2sympy
except Exception:  # pragma: no cover
    latex2sympy = None

from app.models.ocr import MATH_NODE_REVIEW_THRESHOLD


class LatexParseError(ValueError):
    """Raised when corrected LaTeX cannot be parsed via the SymPy pipeline."""


def _serialize_sympy(expr: Any, default_confidence: float) -> dict[str, Any]:
    children = [_serialize_sympy(arg, default_confidence) for arg in getattr(expr, 'args', ())]
    confidence = max(0.0, min(1.0, float(default_confidence)))
    return {
        'type': getattr(getattr(expr, 'func', None), '__name__', type(expr).__name__),
        'value': str(expr),
        'children': children,
        'confidence': confidence,
        'requires_review': confidence < MATH_NODE_REVIEW_THRESHOLD,
    }


def _math_nodes_from_ast(ast: dict[str, Any]) -> list[dict[str, Any]]:
    nodes = [
        {
            'node_type': ast['type'],
            'value': ast['value'],
            'confidence': ast['confidence'],
            'status': 'user_confirmed',
            'requires_review': ast['requires_review'],
        }
    ]
    for child in ast.get('children', []):
        nodes.extend(_math_nodes_from_ast(child))
    return nodes


def parse_corrected_latex(latex: str, default_confidence: float = 1.0) -> tuple[Any, dict[str, Any], list[dict[str, Any]]]:
    normalized = latex.strip()
    if not normalized:
        raise LatexParseError('corrected_latex must be non-empty.')

    if latex2sympy is None:
        raise LatexParseError('latex2sympy2 is not installed in the backend environment.')

    try:
        expr = latex2sympy(normalized)
    except Exception as exc:  # noqa: BLE001
        raise LatexParseError(f'Unable to parse corrected_latex: {exc}') from exc

    ast = _serialize_sympy(expr, default_confidence)
    math_nodes = _math_nodes_from_ast(ast)
    return expr, ast, math_nodes
