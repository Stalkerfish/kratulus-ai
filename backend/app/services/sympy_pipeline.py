from __future__ import annotations

from typing import Any

from sympy import Basic, srepr, sympify

try:
    from sympy.parsing.latex import parse_latex
except Exception:  # pragma: no cover - parse_latex may not be installed with all extras
    parse_latex = None


class LatexParseError(ValueError):
    """Raised when corrected LaTeX cannot be parsed via the SymPy pipeline."""


def _ast_from_sympy(expr: Basic) -> dict[str, Any]:
    return {
        "type": expr.__class__.__name__,
        "repr": srepr(expr),
        "str": str(expr),
    }


def _math_nodes_from_sympy(expr: Basic, user_confirmed: bool = True) -> list[dict[str, Any]]:
    status = "user_confirmed" if user_confirmed else "parsed"
    nodes: list[dict[str, Any]] = [
        {
            "node_type": expr.__class__.__name__,
            "value": str(expr),
            "confidence": 1.0 if user_confirmed else 0.95,
            "status": status,
        }
    ]

    for sub_expr in expr.args:
        if isinstance(sub_expr, Basic):
            nodes.append(
                {
                    "node_type": sub_expr.__class__.__name__,
                    "value": str(sub_expr),
                    "confidence": 1.0 if user_confirmed else 0.95,
                    "status": status,
                }
            )

    return nodes


def parse_corrected_latex(latex: str) -> tuple[Basic, dict[str, Any], list[dict[str, Any]]]:
    normalized = latex.strip()
    if not normalized:
        raise LatexParseError("corrected_latex must be non-empty.")

    try:
        if parse_latex:
            expr = parse_latex(normalized)
        else:
            expr = sympify(normalized)
    except Exception as exc:  # pragma: no cover - dependent on parser internals
        raise LatexParseError(f"Unable to parse corrected_latex: {exc}") from exc

    ast = _ast_from_sympy(expr)
    math_nodes = _math_nodes_from_sympy(expr, user_confirmed=True)
    return expr, ast, math_nodes
