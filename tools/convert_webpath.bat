@echo off
REM WebPath HTML Batch Converter for Windows
REM Usage: Double-click this file or run from command line

echo ========================================
echo WebPath HTML to Markdown Converter
echo ========================================
echo.

REM Set paths
set INPUT_DIR=webpath_data\html\webpath.med.utah.edu
set OUTPUT_DIR=webpath_md_output
set SCRIPT=webpath_html_to_md.py

REM Check if input directory exists
if not exist "%INPUT_DIR%" (
    echo ERROR: Input directory not found: %INPUT_DIR%
    echo Please update the INPUT_DIR variable in this script
    pause
    exit /b 1
)

REM Check if Python script exists
if not exist "%SCRIPT%" (
    echo ERROR: Conversion script not found: %SCRIPT%
    echo Please ensure webpath_html_to_md.py is in the same directory
    pause
    exit /b 1
)

REM Create output directory
if not exist "%OUTPUT_DIR%" (
    echo Creating output directory: %OUTPUT_DIR%
    mkdir "%OUTPUT_DIR%"
)

REM Run conversion
echo.
echo Starting batch conversion...
echo Input:  %INPUT_DIR%
echo Output: %OUTPUT_DIR%
echo.

python "%SCRIPT%" --batch "%INPUT_DIR%" "%OUTPUT_DIR%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Conversion completed successfully!
    echo ========================================
    echo.
    echo Converted files are in: %OUTPUT_DIR%
    echo.
    echo You can now:
    echo 1. Review the .md files
    echo 2. Upload them to Nexent knowledge base
    echo 3. Test the interactive pathology viewer
    echo.
) else (
    echo.
    echo ========================================
    echo Conversion failed with errors
    echo ========================================
    echo Please check the error messages above
    echo.
)

pause
