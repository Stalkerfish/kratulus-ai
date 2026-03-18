from __future__ import annotations
import asyncio
import json
from app.routers.ocr import ProcessInkRequest, process_ink, Stroke, CanvasMeta
from app.services.base import OCREngineName

async def test():
    # Simulate a single stroke
    stroke = Stroke(x=[100, 110, 120], y=[200, 210, 220], t=[0, 10, 20])
    request = ProcessInkRequest(
        strokes=[stroke],
        canvas_meta=CanvasMeta(width=500, height=500),
        preferred_engine=OCREngineName.pix2text
    )
    
    try:
        response = await process_ink(request)
        print("Response successful")
        print(response.model_dump_json(indent=2))
    except Exception as e:
        import traceback
        print("Caught exception:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
