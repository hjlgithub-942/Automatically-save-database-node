const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const moment = require('moment/moment');

// 配置
const databaseUserName = 'root';//数据库用户名
const databasePassWord = '123456';//数据库密码
const yourDatabaseName = 'testBaseName';//需要保存的库名 请确保库名存在
const savedDirectory = 'J:\\database';// 保存的目录  转义 \\ 请确保目录存在 且目录下为空 可能会误删文件
const keepCount = 5; // 最多保留文件数量  配置 -1 将不删除多余文件  获取文件夹下所有文件数量 删除最旧的文件
const backupDataTime = '30 1 1 * * *';//任务执行时间
// *           每分钟的第30秒触发： 30 * * * * *
// *           每小时的1分30秒触发 ：30 1 * * * *
// *           每天的凌晨1点1分30秒触发 ：30 1 1 * * *
// *           每月的1日1点1分30秒触发 ：30 1 1 1 * *
// *           每年的1月1日1点1分30秒触发 ：30 1 1 1 1 *
// *           每周1的1点1分30秒触发 ：30 1 1 * * 1


const logFile = path.join(__dirname, 'log.txt');
// 保存日志函数，将内容追加到日志文件中
function saveLog(log) {
  fs.appendFile(logFile, moment().format('YYYY-MM-DD HH:mm:ss') + '——' + log + '\n', (error) => {
    if (error) {
      console.error(`保存日志出错: ${error.message}`);
    } else {
      console.log(log);
    }
  });
}


// 删除目标文件夹中最旧的数据
function deleteOldestData(targetFolder, keepCount) {
  fs.readdir(targetFolder, (err, files) => {
    if (err) {
      saveLog(`读取删除多余文件失败${err}`)
      return;
    }
    // 按照文件的修改时间进行排序
    files = files.map(file => ({
      name: file,
      time: fs.statSync(path.join(targetFolder, file)).mtime.getTime(),
    })).sort((a, b) => a.time - b.time);

    // 目录中文件需多过最多保存的数量 才可进行删除  并且保留数要大于0
    if ((files.length - keepCount > 0) && keepCount > 0) {
      // 删除最旧的文件
      const deleteFiles = files.slice(0, files.length - keepCount);
      deleteFiles.forEach(file => {
        const deletePath = path.join(targetFolder, file.name);
        fs.unlink(deletePath, (err) => {
          if (err) {
            saveLog(`删除多余文件失败${err}`)
          } else {
            saveLog(`删除多余文件成功！${deletePath}`)
          }
        });
      });
    }
  });
}


saveLog('任务启动-自动备份数据库&&执行时间' + backupDataTime)

// 每天的0点执行备份任务
cron.schedule(backupDataTime, () => {
  // 获取当前日期和时间
  const currentDateTime = moment().format('YYYY-MM-DD') + '-' + new Date().getTime();
  saveLog('执行备份数据库操作');
  // 备份文件名称
  const backupFileName = `/${currentDateTime}.sql`;
  // 备份命令
  const backupCommand = `mysqldump -u ${databaseUserName} -p${databasePassWord} ${yourDatabaseName} > ${savedDirectory}${backupFileName}`;
  // 执行备份命令
  exec(backupCommand, (error, stdout, stderr) => {
    if (error) {
      saveLog(`备份过程出错: ${error.message}`)
    } else {
      saveLog(`备份数据库成功：保存地址名称${savedDirectory}${backupFileName}`)
      // 保存成功 删除最旧的 防止过多
      if (keepCount !== -1) {
        deleteOldestData(savedDirectory, keepCount);
      }
    }
  });
});