# API Contract

## Automation

### Open Website

POST /api/automation/open-website

Request:

```json
{
  "url": "https://google.com"
}
```

### Open Application

POST /api/automation/open-app

Request:

```json
{
  "app": "calculator"
}
```

### Capture Screenshot

POST /api/automation/screenshot

Request:

```json
{}
```

---

## System

### Get System Information

GET /api/system/info

---

## Files

### Create Folder

POST /api/files/create-folder

```json
{
  "folderName": "test-folder"
}
```

### Create File

POST /api/files/create-file

```json
{
  "fileName": "notes.txt",
  "content": "Hello Jarvis"
}
```

### Rename File

PATCH /api/files/rename-file

```json
{
  "oldName": "notes.txt",
  "newName": "jarvis-notes.txt"
}
```

### Delete File

DELETE /api/files/delete-file

```json
{
  "fileName": "jarvis-notes.txt"
}
```

---

## Reminders

### Create Reminder

POST /api/reminders

```json
{
  "text": "Submit project report"
}
```

### Get Reminders

GET /api/reminders

### Delete Reminder

DELETE /api/reminders/:id
