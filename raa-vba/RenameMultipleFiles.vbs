'Declare variables
Dim objParentPath
Dim objFileSystem
Dim objFolder

'Get the parent directory
Set objParentPath = CreateObject("Scripting.FileSystemObject")

'Get access to the file system
Set objFileSystem = WScript.CreateObject("Scripting.FileSystemObject")

Set objFolder = objFileSystem.GetFolder(objParentPath.GetAbsolutePathName(""))

'Read cells value and rename files accordingly
For Each objFile in objFolder.Files
	If  i < 3 And objFileSystem.GetExtensionName(objFile) = "xlsx" Then
		objFileSystem.MoveFile objFolder & "\" & objFile.Name, objFolder & "\2020_" & objFile.Name
	End If
Next



'Clear the memory
Set objParentPath = Nothing

Set objFileSystem = Nothing

Set objFolder = Nothing


'Signal all was done
MsgBox("Done")

'@AdrKacz