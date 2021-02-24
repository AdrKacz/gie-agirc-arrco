Private Sub SplitData()

    '### 17-03-2019 ###
    
    Const FirstC As String = "A" '1st column
    
    Const LastC As String = "M" 'last column
    
    Const sCol As String = "J" '<<< Criteria in Column sCOL
    
    Const shN As String = "Termines" '<<< Source Sheet
    
    Dim ws As Worksheet, ws1 As Worksheet
    
    Set ws = Sheets(shN)
    
    Dim rng As Range
    
    Dim r As Long, c As Long, x As Long, r1 As Long
    
    Application.ScreenUpdating = False
    
    r = ws.Range(FirstC & ":" & LastC).Find(What:="*", SearchOrder:=xlByRows, SearchDirection:=xlPrevious).Row
    
    c = ws.Cells.Find(What:="*", SearchOrder:=xlByColumns, SearchDirection:=xlPrevious).Column + 2
    
    Set rng = ws.Range(ws.Cells(1, FirstC), ws.Cells(r, LastC))
    
    ws.Range(sCol & ":" & sCol).Copy
    
    ws.Cells(1, c).PasteSpecial xlValues
    
    Application.CutCopyMode = False
    
    ws.Cells(1, c).Resize(r).RemoveDuplicates Columns:=1, Header:=xlYes
    
    r1 = ws.Cells(Rows.Count, c).End(xlUp).Row
    
    ws.Cells(1, c).Resize(r1).Sort Key1:=ws.Cells(1, c), Header:=xlYes
    
    ws.AutoFilterMode = False
    
    Application.DisplayAlerts = False
    
    For x = 2 To r1
    
        For Each ws1 In Sheets
    
            If ws1.Name = ws.Cells(x, c) Then ws1.Delete
    
        Next
    
    Next
    
    Application.DisplayAlerts = True
    
    For x = 2 To r1
    
        ws.Range(ws.Cells(1, sCol), ws.Cells(r, sCol)).AutoFilter Field:=1, Criteria1:=ws.Cells(x, c)
    
        Set ws1 = Worksheets.Add(after:=Worksheets(Worksheets.Count))
        
        ws1.Name = ws.Cells(x, c).Value
        
        rng.SpecialCells(xlCellTypeVisible).Copy
        
        Range("A1").PasteSpecial Paste:=xlPasteFormats
        
        Range("A1").PasteSpecial Paste:=xlPasteColumnWidths
        
        Range("A1").PasteSpecial Paste:=xlPasteValues
        
        Application.CutCopyMode = False
    
    Next x
    
    With ws
    
        .AutoFilterMode = False
        
        .Cells(1, c).Resize(r).ClearContents
        
        .Activate
        
        .Range("A1").Select
    
    End With
    
    Application.ScreenUpdating = True
    
    End Sub
    
Sub MainStep1()
    'First, split the data
    SplitData
End Sub
