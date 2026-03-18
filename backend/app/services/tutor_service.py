from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
import uuid

from sympy import latex, simplify, diff, integrate, Symbol, solve, Add, Mul, Pow, Symbol
from app.services.sympy_pipeline import parse_corrected_latex, LatexParseError

LOGGER = logging.getLogger(__name__)

class TutorService:
    async def analyze(self, latex_str: str, requested_action: str | None = None) -> dict[str, Any]:
        try:
            expr, ast, _ = parse_corrected_latex(latex_str)
        except LatexParseError as exc:
            return {
                "message": {
                    "id": f"msg_{uuid.uuid4()}",
                    "role": "tutor",
                    "content": f"I had trouble parsing that expression: {exc}. Please check the LaTeX syntax.",
                    "createdAt": datetime.now().strftime("%H:%M:%S")
                }
            }

        # Determine strategy based on expr
        analysis = self._perform_math_analysis(expr)
        
        content = self._generate_response_content(analysis, requested_action)

        return {
            "message": {
                "id": f"msg_{uuid.uuid4()}",
                "role": "tutor",
                "content": content,
                "createdAt": datetime.now().strftime("%H:%M:%S")
            }
        }

    def _perform_math_analysis(self, expr: Any) -> dict[str, Any]:
        # Analyze variables
        variables = sorted([str(s) for s in expr.free_symbols])
        
        analysis = {
            "variables": variables,
            "simplified": str(simplify(expr)),
            "simplified_latex": latex(simplify(expr)),
            "type": type(expr).__name__
        }

        # If it's a univariate expression, try some calculus
        if len(variables) == 1:
            var = Symbol(variables[0])
            try:
                analysis["derivative"] = str(diff(expr, var))
                analysis["derivative_latex"] = latex(diff(expr, var))
                # For integrals, only show if it doesn't look like a total mess
                integ = integrate(expr, var)
                analysis["integral_latex"] = latex(integ)
            except Exception:
                pass

        return analysis

    def _generate_response_content(self, analysis: dict[str, Any], action: str | None) -> str:
        if action == "step_hint":
            return f"To proceed, observe that this is a {analysis['type']} expression. A good next step might be to look for common patterns or try to simplify it to: ${analysis['simplified_latex']}$."
        
        if action == "identify_error":
            return "Based on my analysis, the expression is mathematically sound. If you are stuck, check if you've correctly identified the variables: " + ", ".join(analysis['variables']) + "."

        if action == "synthesize_proof":
            return f"A formal proof for this expression would likely involve showing how it simplifies to ${analysis['simplified_latex']}$ using standard algebraic identities."

        return f"This looks like a {analysis['type']} in {', '.join(analysis['variables'])}. It simplifies to ${analysis['simplified_latex']}$."
