Private Sub SplitData()
    'Depend on the file, Stock and Termines have different method to split the data --> Look at why the Termines method doesn't work on Stock workbook
    'updateby Extendoffice
    Dim lr As Long
    Dim ws As Worksheet
    Dim vcol, i As Integer
    Dim icol As Long
    Dim myarr As Variant
    Dim title As String
    Dim titlerow As Integer
    Dim xTRg As Range
    Dim xVRg As Range
    Dim xWSTRg As Worksheet
    On Error Resume Next
    Set xTRg = Application.InputBox("Selectionner les en-tetes:", "Separer les donnees (1/2)", "", Type:=8)
    If TypeName(xTRg) = "Nothing" Then Exit Sub
    Set xVRg = Application.InputBox("Selectionner les valeurs de la colonne Libelle Groupe (à partir de la 2eme ligne)", "Separer les donnees (2/2)", "", Type:=8)
    If TypeName(xVRg) = "Nothing" Then Exit Sub
    vcol = xVRg.Column
    Set ws = xTRg.Worksheet
    lr = ws.Cells(ws.Rows.Count, vcol).End(xlUp).Row
    title = xTRg.AddressLocal
    titlerow = xTRg.Cells(1).Row
    icol = ws.Columns.Count
    ws.Cells(1, icol) = "Unique"
    Application.DisplayAlerts = False
    If Not Evaluate("=ISREF('xTRgWs_Sheet!A1')") Then
    Sheets.Add(after:=Worksheets(Worksheets.Count)).Name = "xTRgWs_Sheet"
    Else
    Sheets("xTRgWs_Sheet").Delete
    Sheets.Add(after:=Worksheets(Worksheets.Count)).Name = "xTRgWs_Sheet"
    End If
    Set xWSTRg = Sheets("xTRgWs_Sheet")
    xTRg.Copy
    xWSTRg.Paste Destination:=xWSTRg.Range("A1")
    ws.Activate
    For i = (titlerow + xTRg.Rows.Count) To lr
    On Error Resume Next
    If ws.Cells(i, vcol) <> "" And Application.WorksheetFunction.Match(ws.Cells(i, vcol), ws.Columns(icol), 0) = 0 Then
    ws.Cells(ws.Rows.Count, icol).End(xlUp).Offset(1) = ws.Cells(i, vcol)
    End If
    Next
    myarr = Application.WorksheetFunction.Transpose(ws.Columns(icol).SpecialCells(xlCellTypeConstants))
    ws.Columns(icol).Clear
    For i = 2 To UBound(myarr)
    ws.Range(title).AutoFilter field:=vcol, Criteria1:=myarr(i) & ""
    If Not Evaluate("=ISREF('" & myarr(i) & "'!A1)") Then
    Sheets.Add(after:=Worksheets(Worksheets.Count)).Name = myarr(i) & ""
    Else
    Sheets(myarr(i) & "").Move after:=Worksheets(Worksheets.Count)
    End If
    xWSTRg.Range(title).Copy
    Sheets(myarr(i) & "").Paste Destination:=Sheets(myarr(i) & "").Range("A1")
    ws.Range("A" & (titlerow + xTRg.Rows.Count) & ":A" & lr).EntireRow.Copy Sheets(myarr(i) & "").Range("A" & (titlerow + xTRg.Rows.Count))
    Sheets(myarr(i) & "").Columns.AutoFit
    Next
    xWSTRg.Delete
    ws.AutoFilterMode = False
    ws.Activate
    Application.DisplayAlerts = True
End Sub

Private Sub ExportData(Str_Appendix_Date As String)
    On Error GoTo ErrorHandler
    Dim Str_Current_File As String
    Str_Current_File = ""
    Dim Has_Error_Text As String
    Has_Error_Text = ""
    'Loop over the Worksheets
    ' Declare Current as a worksheet object variable.
    Dim Current As Worksheet
    Dim C_Name As String


    Dim Str_Working_Template As String
    Dim Str_Termines_Template As String

    Dim Last_Current_Row As Long
    Dim Last_Termines_Row As Long

    Dim Last_Working_Row_Termines As Long
    Dim Last_Working_Row_Stock As Long

    ' Get current directory
    Dim Str_Path As String
    Str_Path = ThisWorkbook.path
    

    Str_Working_Template = "S:\DirectionPOP\General\CONTRATS OBJECTIFS ET MOYENS 2019 2022\09 Reporting COM\2019\BDD - Fichiers de travail\Actifs\2021\Data source\Rectifications de carriere\Automatisation\Templates\Modele-Groupe.xlsx"
    Str_Termines_Template = Str_Path & "\Termines-Step-1.xlsm"

    ' Open the Termines Workbook, Check if step 1 has been performed already done
    Dim Termines As Workbook
    Set Termines = Workbooks.Add(Str_Termines_Template)
    ' Open the working template
    Dim Working As Workbook
    Set Working = Workbooks.Add(Str_Working_Template)

    ' Loop through all of the worksheets in the active workbook.
    For Each Current In ThisWorkbook.Worksheets
        ' Insert your code here.
        C_Name = Current.Name
        If ((Not C_Name Like "Feuil*") And (C_Name <> "Stocks") And (C_Name <> "Termines")) Then
            Str_Current_File = C_Name
            Has_Error_Text = ""
            'Then copy data on another Workbook

            'Last used rows
            Last_Current_Row = Current.Cells(Current.Rows.Count, "A").End(xlUp).Row
            Last_Termines_Row = Termines.Worksheets(C_Name).Cells(Termines.Worksheets(C_Name).Rows.Count, "A").End(xlUp).Row

            Last_Working_Row_Termines = Working.Worksheets("GPS_Dossiers_Termines").Cells(Working.Worksheets("GPS_Dossiers_Termines").Rows.Count, "A").End(xlUp).Offset(1).Row
            Last_Working_Row_Stock = Working.Worksheets("GPS_Stock").Cells(Working.Worksheets("GPS_Stock").Rows.Count, "A").End(xlUp).Offset(1).Row

            'Clear previous content
            Working.Worksheets("GPS_Dossiers_Termines").Range("A2:M" & Last_Working_Row_Termines).ClearContents
            Working.Worksheets("GPS_Stock").Range("A2:O" & Last_Working_Row_Stock).ClearContents

            'Copy the data into
            Termines.Worksheets(C_Name).Range("A2:M" & Last_Termines_Row).Copy Working.Worksheets("GPS_Dossiers_Termines").Range("A2")
            Current.Range("A2:O" & Last_Current_Row).Copy Working.Worksheets("GPS_Stock").Range("A2")
            
            'Saving the Workbook
            Working.SaveAs Filename:=Str_Path & "\" & Has_Error_Text & Str_Current_File & "_rectif IA_" & Str_Appendix_Date & ".xlsx"
        End If
    Next
    Working.Close SaveChanges:=False
    Termines.Close SaveChanges:=False
Exit Sub
ErrorHandler:
MsgBox "Il y a eu une erreur avec <" & Str_Current_File & ">"
Has_Error_Text = "ERROR - "
Resume Next
End Sub
    
Sub MainStep2()
    'Get parent path
    Dim Str_Path As String
    Str_Path = ThisWorkbook.path
    ' Check if Step 1 has been performed --> To complete
    Dim Str_Termines_Template As String
    Str_Termines_Template = Str_Path & "\Termines-Step-1.xlsm"

    Dim Termines As Workbook
    Set Termines = Workbooks.Add(Str_Termines_Template)
    If (Termines.Worksheets.Count <= 1) Then
        MsgBox "Step 1 wasn't executed yet"
        Termines.Close SaveChanges:=False
        Exit Sub
    End If
    Termines.Close SaveChanges:=False

    'Get the date to append at the
    Dim Str_Appendix_Date As String
    
    Str_Appendix_Date = InputBox("Entrer la date en rajouter en queue de nom de fichier (format MMAAAA, ex: 102020)", "Date des rapports")
    'First, split the data
    SplitData
    
    'Copy each Worksheet in a new Workbook
    ExportData (Str_Appendix_Date)
End Sub

