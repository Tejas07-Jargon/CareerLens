import google.generativeai as genai, os, sys
from dotenv import load_dotenv
load_dotenv()
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
models = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.1-flash-lite']
for m in models:
  try:
    r = genai.GenerativeModel(m).generate_content('test')
    print(f'{m}: SUCCESS')
  except Exception as e:
    print(f'{m}: ERROR {e}')
