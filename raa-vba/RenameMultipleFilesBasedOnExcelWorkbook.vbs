'Declare variable
Dim objParentPath
Dim objFileSystem
Dim objExcel, objExcelWbs, objExcelWb, objExcelSheet, objExcelCells
Dim strFirstRow, strFirstColomn, strNbFiles, strOldDirectory, strNewDirectory
Dim strOldFile, strNewFile
Dim i

'Get the parent directory
Set objParentPath = CreateObject("Scripting.FileSystemObject")

'Get access to the file system
Set objFileSystem = WScript.CreateObject("Scripting.FileSystemObject")

'Open the Excel file
Set objExcel = CreateObject("Excel.Application")
Set objExcelWbs = objExcel.Workbooks
objExcel.Visible = False
Set objExcelWb = objExcelWbs.Open(objParentPath.GetAbsolutePathName("RenamedTable.xlsx"))
Set objExcelSheet = objExcelWb.Sheets("Noms")

'Get the number of files to renamed and the position of the first file
Set strNbFiles = objExcelSheet.Range("E4")
Set strFirstRow = objExcelSheet.Range("E5")
Set strFirstColomn = objExcelSheet.Range("E6")

'Read the main directory and assign it
Set strOldDirectory = objExcelSheet.Range("E2")
Set strNewDirectory = objExcelSheet.Range("E3")

'Get cells value
Set objExcelCells = objExcelSheet.Cells

'Read cells value and rename files accordingly
For i = strFirstRow To strFirstRow + strNbFiles - 1
	Set strOldFile = objExcelCells(i, strFirstColomn)
	Set strNewFile = objExcelCells(i, strFirstColomn + 1)
	If objFileSystem.FileExists(strOldDirectory & strOldFile) Then	
		objFileSystem.CopyFile strOldDirectory & strOldFile, strNewDirectory & strNewFile
	Else
		MsgBox "File Not Found" & vbNewLine & strOldDirectory & strOldFile
	End If
Next

'Close Excel
objExcelWb.Close False
objExcelWbs.Close
objExcel.Quit


'Clear the memory
Set objParentPath = Nothing

Set objFileSystem = Nothing

Set objExcelSheet = Nothing
Set objExcelWb = Nothing
Set objExcelWbs = Nothing
Set objExcel = Nothing
Set objExcelCells = Nothing

Set strFirstRow = Nothing
Set strFirstColomn = Nothing
Set strNbFiles = Nothing
Set strOldDirectory = Nothing
Set strNewDirectory = Nothing

Set strOldFile = Nothing
Set strNewFile = Nothing

Set i = Nothing




'Signal all was done
MsgBox("Done")

'@AdrKacz