import asyncio
from app.services.adapters.live_probe_adapter import LiveProbeAdapter
from app.core.config import settings

def _test_llm():
    import google.generativeai as genai
    genai.configure(api_key=settings.get_gemini_api_key())
    model = genai.GenerativeModel(settings.LLM_FAST_MODEL)
    try:
        print('Requesting...')
        r = model.generate_content('test')
        print('Done:', r.text)
    except Exception as e:
        print('ERROR:', repr(e))

if __name__ == '__main__':
    _test_llm()
