// ============================================
// SETTINGS LEGACY FILE OPERATIONS MODULE
// ============================================

function writeBackupFileLegacy(fileName, data) {
  try {
    var appDir = new android.File(BACKUP_DIR_LEGACY);
    var dirExists = appDir.exists();
    
    if (!dirExists) {
      var created = appDir.mkdirs();
      if (!created) {
        return { success: false, error: "Не удалось создать папку" };
      }
    }
    
    var backupFile = new android.File(BACKUP_DIR_LEGACY + "/" + fileName);
    if (!backupFile.exists()) {
      backupFile.createNewFile();
    }
    
    backupFile.write(data);
    
    return { 
      success: true, 
      path: BACKUP_DIR_LEGACY + "/" + fileName 
    };
    
  } catch (error) {
    console.error("Write backup error:", error);
    return { success: false, error: error.message };
  }
}

function readBackupFileLegacy(fileName) {
  try {
    var appDir = new android.File(BACKUP_DIR_LEGACY);
    if (!appDir.exists()) {
      return { 
        success: false, 
        path: BACKUP_DIR_LEGACY + "/" + fileName, 
        error: "Папка не существует" 
      };
    }
    
    var backupFile = new android.File(BACKUP_DIR_LEGACY + "/" + fileName);
    if (!backupFile.exists()) {
      return { 
        success: false, 
        path: BACKUP_DIR_LEGACY + "/" + fileName, 
        error: "Файл не найден" 
      };
    }
    
    return { 
      success: true, 
      path: BACKUP_DIR_LEGACY + "/" + fileName, 
      data: backupFile.read() 
    };
    
  } catch (error) {
    console.error("Read backup error:", error);
    return { success: false, path: BACKUP_DIR_LEGACY + "/" + fileName, error: error.message };
  }
}
