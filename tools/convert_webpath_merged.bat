@echo off
REM WebPath HTML Merge Converter for Windows (Category-based)
REM Usage: Double-click this file or run from command line

echo ========================================
echo WebPath HTML Merger (by Category)
echo ========================================
echo.

REM Set paths
set INPUT_DIR=webpath_data\html\webpath.med.utah.edu
set OUTPUT_DIR=webpath_knowledge_merged
set SCRIPT=webpath_merge_by_category.py

REM Check if input directory exists
if not exist "%INPUT_DIR%" (
    echo ERROR: Input directory not found: %INPUT_DIR%
    echo Please update the INPUT_DIR variable in this script
    echo.
    echo Current directory: %CD%
    pause
    exit /b 1
)

REM Check if Python script exists
if not exist "%SCRIPT%" (
    echo ERROR: Conversion script not found: %SCRIPT%
    echo Please ensure webpath_merge_by_category.py is in the same directory
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
echo Starting category-based merge conversion...
echo.
echo Input:  %INPUT_DIR%
echo Output: %OUTPUT_DIR%
echo.
echo This will:
echo - Group HTML files by filename prefix (CV, ATH, RENAL, etc.)
echo - Merge each category into ONE knowledge base document
echo - Preserve all image annotations
echo - Support interactive multi-image viewer
echo.
echo Processing 3962 HTML files... this may take a few minutes...
echo.

python "%SCRIPT%" "%INPUT_DIR%" "%OUTPUT_DIR%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Conversion completed successfully!
    echo ========================================
    echo.
    echo Check the summary: %OUTPUT_DIR%\_CONVERSION_SUMMARY.md
    echo.
    echo Next steps:
    echo 1. Review the generated .md files in %OUTPUT_DIR%\
    echo 2. Upload them to Nexent knowledge base
    echo 3. Each category = 1 knowledge base document
    echo 4. Test interactive pathology viewer with multi-image support
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
