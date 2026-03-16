"""Utilities for parsing calculus-heavy LaTeX into SymPy expressions.

This module focuses on Calc 3 notation that may not be directly accepted by
``latex2sympy2`` and rewrites it into parser-friendly forms before parsing.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import re
from typing import Any

from latex2sympy2 import latex2sympy


_NABLA_SIMPLE_PATTERN = re.compile(r"\\nabla\s*([a-zA-Z][a-zA-Z0-9_]*)")
_PARTIAL_FRAC_PATTERN = re.compile(
    r"\\frac\s*\{\\partial\s*(?P<expr>[^{}]+?)\}\s*\{\\partial\s*(?P<var>[a-zA-Z][a-zA-Z0-9_]*)\}"
)
_PARTIAL_OPERATOR_PATTERN = re.compile(
    r"\\partial\s*/\s*\\partial\s*(?P<var>[a-zA-Z][a-zA-Z0-9_]*)\s*(?P<expr>[a-zA-Z][a-zA-Z0-9_]*)"
)


@dataclass(slots=True)
class ParserErrorObject:
    """Structured parser error for endpoint-level validation responses."""

    code: str
    message: str
    original_latex: str
    preprocessed_latex: str
    hint: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


class SympyParserException(ValueError):
    """Raised when LaTeX preprocessing or parsing fails."""

    def __init__(self, error: ParserErrorObject) -> None:
        super().__init__(error.message)
        self.error = error


@dataclass(slots=True)
class ParsedExpressionPayload:
    """Result payload for machine and display use."""

    canonical: str
    ast: dict[str, Any]
    original_latex: str
    preprocessed_latex: str


def preprocess_calc3_latex(latex: str) -> str:
    """Normalize Calc 3 LaTeX notations to parser-friendly forms.

    Rewrites include:
    - ``\\nabla f`` to ``gradient(f)`` placeholders.
    - First-order partial derivative fractions into ``diff(expr, var)``.
    - ``\\iint`` and ``\\iiint`` into repeated ``\\int`` tokens.
    """

    transformed = latex

    transformed = _NABLA_SIMPLE_PATTERN.sub(r"gradient(\1)", transformed)

    transformed = _PARTIAL_FRAC_PATTERN.sub(
        lambda m: f"diff({m.group('expr').strip()}, {m.group('var').strip()})",
        transformed,
    )

    transformed = _PARTIAL_OPERATOR_PATTERN.sub(
        lambda m: f"diff({m.group('expr').strip()}, {m.group('var').strip()})",
        transformed,
    )

    transformed = transformed.replace(r"\iiint", r"\int\int\int")
    transformed = transformed.replace(r"\iint", r"\int\int")

    return transformed


def parse_latex_expression(latex: str) -> ParsedExpressionPayload:
    """Parse LaTeX into a canonical SymPy representation and structured AST.

    Raises:
        SympyParserException: If the expression is invalid or ambiguous.
    """

    preprocessed = preprocess_calc3_latex(latex)
    _validate_preprocessed_tokens(latex, preprocessed)

    try:
        expr = latex2sympy(preprocessed)
    except Exception as exc:  # noqa: BLE001
        raise SympyParserException(
            ParserErrorObject(
                code="LATEX_PARSE_ERROR",
                message="Unable to parse LaTeX into a SymPy expression.",
                original_latex=latex,
                preprocessed_latex=preprocessed,
                hint=(
                    "Check derivative bounds/variables and ensure all integrals "
                    "contain matching differential terms (e.g., dx, dy)."
                ),
                details={"exception_type": type(exc).__name__, "exception": str(exc)},
            )
        ) from exc

    return ParsedExpressionPayload(
        canonical=str(expr),
        ast=_serialize_sympy_node(expr),
        original_latex=latex,
        preprocessed_latex=preprocessed,
    )


def parse_latex_expression_safe(latex: str) -> tuple[ParsedExpressionPayload | None, ParserErrorObject | None]:
    """Safe parser wrapper returning either result payload or structured error."""

    try:
        return parse_latex_expression(latex), None
    except SympyParserException as exc:
        return None, exc.error


def _validate_preprocessed_tokens(original: str, preprocessed: str) -> None:
    unsupported_patterns = {
        r"\\nabla": "Replace nabla notation with an explicit operand, e.g. \\nabla f.",
        r"\\partial": "Use explicit partial derivative fraction, e.g. \\frac{\\partial f}{\\partial x}.",
        r"\\iint": "Use integral bounds and differentials explicitly for double integrals.",
        r"\\iiint": "Use integral bounds and differentials explicitly for triple integrals.",
    }

    for pattern, hint in unsupported_patterns.items():
        if re.search(pattern, preprocessed):
            raise SympyParserException(
                ParserErrorObject(
                    code="AMBIGUOUS_CALC3_NOTATION",
                    message="Expression contains ambiguous Calc 3 notation after preprocessing.",
                    original_latex=original,
                    preprocessed_latex=preprocessed,
                    hint=hint,
                    details={"pattern": pattern},
                )
            )


def _serialize_sympy_node(node: Any) -> dict[str, Any]:
    """Serialize a SymPy node into a JSON-friendly AST payload."""

    if not hasattr(node, "args"):
        return {"type": type(node).__name__, "value": str(node)}

    serialized_args: list[Any] = []
    for arg in getattr(node, "args", ()):  # pragma: no branch
        if hasattr(arg, "args"):
            serialized_args.append(_serialize_sympy_node(arg))
        else:
            serialized_args.append({"type": type(arg).__name__, "value": str(arg)})

    return {
        "type": node.func.__name__ if hasattr(node, "func") else type(node).__name__,
        "args": serialized_args,
        "repr": str(node),
    }
