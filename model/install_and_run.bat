@echo off
echo Installing packages... This may take 5-10 minutes.
echo.
..\hacktheburgh-2025\Scripts\python.exe -m pip install -r requirements.txt
echo.
if %ERRORLEVEL% EQU 0 (
    echo Installation completed successfully!
    echo.
    echo Starting server...
    ..\hacktheburgh-2025\Scripts\python.exe -m uvicorn api_service:app --reload --host 0.0.0.0 --port 8000
) else (
    echo Installation failed. Please check the error messages above.
    pause
)

