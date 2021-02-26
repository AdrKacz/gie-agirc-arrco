' ------------------------------
' ---------- MAIN PROCESS ----------
' ------------------------------

' Declare variables
Dim objFSO
Dim strFileSelected
Dim strFolder
Dim strFolderEnd

Dim objExcel, objExcelWbs

' Assign constant
strFolder = "C:\Users\B602\Desktop\RepriseHistoriqueENT\Sources\"
strFileSelected = "Rapport de suivi du traitement DSN 07 19" & ".xlsx"

strFolderEnd = "C:\Users\B602\Desktop\RepriseHistoriqueENT\Split\07-Juillet\"


' Assign Object
Set objFSO = CreateObject("Scripting.FileSystemObject")

Set objExcel = CreateObject("Excel.Application")
Set objExcelWbs = objExcel.Workbooks
objExcel.Visible = False

' Loop throught each file of the selected folder
'For Each objFile In objFSO.GetFolder(strFolder).Files
'    If UCase(objFSO.GetExtensionName(objFile.Name)) = "XLSX" Then
'        ProcessFile objFSO, strFolder, objFile, objExcelWbs, strFolderEnd
'    End If
'Next

' Case for only one file
ProcessFile objFSO, strFolder, strFileSelected, objExcelWbs, strFolderEnd
' Close Excel
objExcelWbs.Close
objExcel.Quit

' Clear memory
Set objFSO = Nothing

Set objExcel = Nothing
Set objExcelWbs = Nothing

' Done
MsgBox "Done"


' ------------------------------
' ---------- PROCESS FILE ----------
' ------------------------------

Sub ProcessFile(objFSO, strFolder, strFileName, objExcelWbs, strFolderEnd)

' Declare variables
Dim objExcelWbOld
Dim objExcelWbNew
Dim strGroup, strDate

' Open Workbook
Set objExcelWbOld = objExcelWbs.Open(strFolder & strFileName)

For Each objExcelSheet In objExcelWbOld.Sheets
    ' Get Group and Date (exception handle by hands)
    strGroup = objExcelSheet.Name
    strDate = objExcelSheet.Range("A4").Value

    ' Create new Workbook and copy first
    objExcelSheet.Copy
    Set objExcelWbNew = objExcel.ActiveWorkbook
    ' Save new workbook with the expected format "groupe DSN.aaaamm.xlsx"
    objExcelWbNew.SaveAs(strFolderEnd & strGroup & " DSN." & strDate & ".xlsx")
    

    ' Close new Workbook
    objExcelWbNew.Close False
Next

' Close Workbook
objExcelWbOld.Close False

End Sub