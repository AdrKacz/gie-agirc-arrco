'Script to fusion multiple version of the same original Excel Workbook
'Useful after a day of work when every one has worked on its own version
'Done after a talk with Capryo (Maxime Beaufreton), problem encounter in its society (EY)

Function WorksheetExist(name, worksheets) As Boolean
    For Each ws In worksheets
        If (ws.name = name) Then
            WorksheetExist = True
            Exit Function
        End If
    Next ws
    WorksheetExist = False
End Function

Function SameWorksheet(wsA, wsB) As Boolean
    ' Can use For Each cell In UsedRange but Union doesn't work
    Dim rowA As Long, colA As Long
    Dim rowB As Long, colB As Long
    Dim row As Long, col As Long

    Dim valA As String, valB As String

    With wsA.UsedRange
        rowA = .Rows.Count
        colA = .Columns.Count
    End With
    With wsB.UsedRange
        rowB = .Rows.Count
        colB = .Columns.Count
    End With
    row = rowA
    If rowB > rowA Then
        row = rowB
    End If
    col = colA
    If colB > colA Then
        col = colB
    End If
    
    Dim c As Long, r As Long
    For c = 1 To col
        For r = 1 To row
            If (wsA.Cells(r, c) <> wsB.Cells(r, c)) Then
                ' MsgBox "A: " & wsA.Cells(r, c) & "- B: " & wsB.Cells(r, c)
                ' MsgBox "(Formula) A: " & wsA.Cells(r, c).FormulaLocal & "- B: " & wsB.Cells(r, c).FormulaLocal
                SameWorksheet = False
                Exit Function
            End If
        Next r
    Next c
    SameWorksheet = True
End Function

Private Sub EditWorksheet(wsFrom, wsTo)
    Dim Str_Formula As String
    For Each cell In wsFrom.UsedRange
        Str_Formula = wsFrom.Cells(cell.row, cell.Column).Formula
        ' wsTo.Cells(cell.row, cell.Column).Formula = "=""" & Str_Formula & """"
        If Str_Formula Like "=*" Then
            MsgBox "Current > " & wsTo.Cells(cell.row, cell.Column).Value & "TO > " & Str_Formula
        Else
            wsTo.Cells(cell.row, cell.Column).Value = Str_Formula
        End If
    Next cell
End Sub

Sub Fusion()
    ' Mark all original sheet to delete them then
    ' For Each ws in Worksheets
    '     ws.Name = "TO-DELETE" & ws.Name
    ' Next ws
    ' Get current directory
    Dim objFSO
    Set objFSO = CreateObject("Scripting.FileSystemObject")

    ' String Parameter
    Dim Str_Template_Folder As String
    Dim Str_Versioning_Folder As String

    Str_Template_Folder = ThisWorkbook.Path + "\Template"
    Str_Versioning_Folder = ThisWorkbook.Path + "\Versioning"

    ' Get Folder
    Dim Template_Folder As Object
    Dim Versioning_Folder As Object

    ' MsgBox Str_Template_Folder
    Set Template_Folder = objFSO.GetFolder(Str_Template_Folder)
    ' MsgBox Str_Versioning_Folder
    Set Versioning_Folder = objFSO.GetFolder(Str_Versioning_Folder)

    ' Get Template File
    Dim Template_File As Object
    Dim I As Long
    I = 0
    For Each FileItem In Template_Folder.Files
        If I = 0 Then
            Set Template_File = FileItem
            Exit For
        End If
        I = I + 1
    Next FileItem

    ' Get Template
    Dim Template As Workbook
    Dim WB_Working As Workbook
    Set Template = Workbooks.Add(Str_Template_Folder + "\" + Template_File.name)
    Set WB_Working = Workbooks.Add(Str_Template_Folder + "\" + Template_File.name)
    
    Dim Version As Workbook
    Dim Working As Worksheet
    For Each FileVersion In Versioning_Folder.Files
        If FileVersion.name Like "*xls*" Then
            ' Open Workbook
            Set Version = Workbooks.Add(Str_Versioning_Folder + "\" + FileVersion.name)

            ' Check for difference
            Dim diff As String
            diff = FileVersion.name & "> "
            For Each Sheet In Version.worksheets
                If (WorksheetExist(Sheet.name, Template.worksheets)) Then
                    If (Not SameWorksheet(Sheet, Template.worksheets(Sheet.name))) Then
                        diff = diff & Sheet.name & " -"
                        Call EditWorksheet(Sheet, WB_Working.worksheets(Sheet.name))
                    End If
                End If
            Next Sheet
            ' MsgBox diff

            ' Close Workbook
            Version.Close SaveChanges:=False
        End If
    Next FileVersion
    Template.Close SaveChanges:=False
    Call WB_Working.Close(True, ThisWorkbook.Path + "\FusionUpdated.xlsx")
End Sub



