var express = require('express')
var router = express.Router()
const menu = require('../../src/components/layout/json/menu.json')
const fs = require('fs')
const path = require('path')
const base = path.resolve(__filename, '../../../');
// const iconList = require('../../src/assets/icons/icons.js')
const writeJson = (filePath, jsonString, callback) => {
  fs.writeFile(filePath, jsonString, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    callback()
  });
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' })
})

// 菜单列表
router.post('/sysMenu/queryMenuList', function(req, res, next) {
  const params = req.body
  let data = menu
  if (params.key) data = menu.filter((item) => item.name.indexOf(params.key) > -1)
  res.json({
    code: 200,
    data
  })
})

// 删除菜单
router.post('/sysMenu/del', function(req, res, next) {
  const { id } = req.body
  if (id !== undefined) {
    for (const i of id) {
      const index = menu.findIndex((item) => item.id === i)
      if(index > -1) menu.splice(index, 1)
    }
    writeJson(`${base}/src/components/layout/json/menu.json`, JSON.stringify(menu), () => {
      res.json({
        code: 200,
        data: menu
      })
    })
  }
})


// 新增菜单
router.post('/sysMenu/add', function(req, res, next) {
  const { srcPath, tarPath, name, icon, show, level, parentId, sort, path: menuPath } = req.body
  let max = Math.max(...menu.map(obj => obj['id']))
  if (menu.length === 0) max = 0
  // 获取目标文件夹路径
  const dirPath =`${base}/${tarPath}`

  const add = () => {
    fs.copyFile(`${base}/${srcPath}`, `${base}/${tarPath}`, (err) => {
      if (err) throw err
      menu.push({
        path: menuPath,
        name,
        icon,
        show,
        level,
        parentId,
        component: tarPath,
        sort,
        id: (max ?? 0) + 1
      })
      writeJson(`${base}/src/components/layout/json/menu.json`, JSON.stringify(menu), () => {
        res.json({
          code: 200,
          data: menu
        })
      })
    })
  }
  fs.access(dirPath, (err) => {
    if (err) {
      const p = dirPath.split('/')
      const p1 = dirPath.replace(p[p.length - 1], '')
      fs.mkdir(p1, { recursive: true }, (err) => {
        if (err) throw err
        fs.writeFile(dirPath, '', (err) => {
          if (err) {
            console.error(err);
            return;
          }
          add()
        });
      })
    } else {
      add()
    }
  });
})

router.post('/sysMenu/edit', function(req, res, next) {
  const { row } = req.body
  if (row !== undefined) {
    const index = menu.findIndex((item) => item.id === row.id)
    if(index > -1) {
      menu[index] = row
      writeJson(`${base}/src/components/layout/json/menu.json`, JSON.stringify(menu), () => {
        res.json({
          code: 200,
          data: menu
        })
      })
    }
  }
})

router.post('/sysMenu/setting', function(req, res, next) {
  const { row } = req.body
  if (row !== undefined) {
    writeJson(`${base}/src/components/layout/json/config.json`, JSON.stringify(row), () => {
      res.json({
        code: 200,
        data: row
      })
    })
  }
})

router.post('/sysMenu/icon', async function(req, res, next) {
  const directoryPath = `${base}/src/assets`; // 指定路径
  const searchString = ['iconfont', '.css']; // 指定字符串

  const icons = []

  function getIconFile(folderPath) {
    const files = fs.readdirSync(folderPath);

    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        getIconFile(filePath);
      } else {
        // 检查文件名是否包含指定字符串
        let isIconfont = true;
        for (const item of searchString)
          isIconfont &&= filePath.indexOf(item) > -1

        if (isIconfont) {
          icons.push(filePath)
        }
      }
    });

    return icons;
  }

  const allFiles = getIconFile(directoryPath);
  const matches = [];
  for (const p of allFiles) {
    const file = fs.readFileSync(p, { encoding: "utf-8" });
    const regex = /\.(.*?):before/g;

    let match;

    while ((match = regex.exec(file)) !== null) {
      matches.push(match[0].replace('.', '').replace(':before', ''));
    }

  }
  // 读取目录中的文件
  res.json({
    code: 200,
    data: matches
  })
})

module.exports = router
