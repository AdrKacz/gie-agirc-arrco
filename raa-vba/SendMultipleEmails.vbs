'Declare variables
Dim objParentPath

Dim objOutlook, objEmail
Dim objInformations

Dim objExcel, objExcelWbs, objExcelWb, objExcelSheet, objExcelCells
Dim firstRow, firstColumn, nbMails
Dim strDirectory

Dim i, j

Dim objAdoStream

Dim strEmailBody
Dim strHasToSend, strSignature

'Get the parent directory
Set objParentPath = CreateObject("Scripting.FileSystemObject")

'Connect to the Outlook Application
Set objOutlook = CreateObject("Outlook.Application")

'Base directory of attachments, assign with Excel sheet later


'List of Mails Information -receivers, subject, attachments-
Set objInformations = CreateObject("System.Collections.ArrayList")

'Read Excel sheet to get mails, subject, a attachments
'Open the Excel file
Set objExcel = CreateObject("Excel.Application")
Set objExcelWbs = objExcel.Workbooks
objExcel.Visible = False
Set objExcelWb = objExcelWbs.Open(objParentPath.GetAbsolutePathName("InformationsMails.xlsx"))
Set objExcelSheet = objExcelWb.Sheets("Mails")

'Get the number of rows -i.e. the number of mails to send
Set firstRow = objExcelSheet.Range("H4")
Set firstColumn = objExcelSheet.Range("H5")
Set nbMails = objExcelSheet.Range("H6")

Set objExcelCells = objExcelSheet.Cells

'Read the main directory and assign it
strDirectory = objExcelCells(firstRow - 5, firstColumn + 2).Value

'Read cells and update list of mails
For i = firstRow To firstRow + nbMails - 1
	objInformations.Add CreateObject("Scripting.Dictionary")
	For j = firstColumn To firstColumn + 2
		objInformations.Item(objInformations.Count - 1).Add objExcelCells(firstRow - 4, j).Value , objExcelCells(i, j).Value
	Next
Next

'Close Excel
objExcelWb.Close False
objExcelWbs.Close
objExcel.Quit

'Global attributes of all email -body-
'To Handle Accent
Set objAdoStream = CreateObject("ADODB.Stream")

objAdoStream.Open
objAdoStream.Charset = "UTF-8"
objAdoStream.LoadFromFile = objParentPath.GetAbsolutePathName("body.txt") 'Here is the text used in the mail
strEmailBody = objAdoStream.ReadText(-1)
objAdoStream.Close
		


'Send an email for each receiver
For Each objInformation in objInformations
	'Check if you want to send this email
	strHasToSend = MsgBox("Receivers: " & vbNewLine & objInformation("Mails") & vbNewLine & vbNewLine & "Subject: " & vbNewLine & objInformation("Subject") & vbNewLine & vbNewLine & "Attachments: " & vbNewLine & objInformation("Attachments"), vbQuestion + vbYesNo)
	If strHasToSend = vbYes Then
		'Create email
		Set objEmail = objOutlook.CreateItem(0)
		With objEmail
			.Display
		End With
		strSignature = objEmail.HTMLBody
		With objEmail
			'Fill email
			.To = objInformation("Mails")
			.Subject = objInformation("Subject")
			.Body = strEmailBody
			.HTMLBody = .HTMLBody & strSignature
					
			'Attachments
			If (objInformation("Attachments") <> "") Then
				attachments_list = Split(objInformation("Attachments"), ";")
				For Each attachement In attachments_list
					.Attachments.Add strDirectory & attachement
				Next
			End If
			'Send email
			.Send
		End With
		'Clear the memory
		Set objEmail = Nothing
		
		MsgBox("Message Send")
	End If
Next


'Clear the memory
Set objParentPath = Nothing

Set objOutlook = Nothing
Set objEmail = Nothing

Set objInformations = Nothing

Set objExcel = Nothing
Set objExcelWbs = Nothing
Set objExcelWb = Nothing
Set objExcelSheet = Nothing
Set objExcelCells = Nothing

Set firstRow = Nothing
Set firstColumn = Nothing
Set nbMails = Nothing
Set strDirectory = Nothing

Set i = Nothing
Set j = Nothing

Set objAdoStream = Nothing

Set strEmailBody = Nothing

Set strHasToSend = Nothing
Set strSignature = Nothing

'Signal all was done
Msgbox("Done")

'@AdrKacz