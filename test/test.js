'use strict'
const fs = require('fs')
const {exec, execSync} = require('child_process')
const {expect} = require('chai')
const express = require('express')
const app = express()


const CUSTOM_UA = 'freecdn-test'
const CUSTOM_REFERER = 'http://foo.com/'

app.use(express.static(__dirname + '/find/assets'))

app.listen(30004, '127.0.0.1', () => {
  console.log('http server running...')
})

process.env['FREECDN_STORAGE'] = __dirname + '/.freecdn'


function runAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(stderr)
      } else {
        resolve(stdout)
      }
    })
  })
}

function run(cmd) {
  return execSync(cmd).toString()
}

function $(...args) {
  const cmd = String.raw(...args)
  return run(cmd)
}

function cd(dir) {
  process.chdir(__dirname + '/' + dir)
}

function read(file, enc = 'utf8') {
  return fs.readFileSync(file, enc)
}

function write(file, data) {
  return fs.writeFileSync(file, data)
}

function rm(file) {
  fs.rmSync(file, {
    force: true,
    recursive: true,
  })
}


describe('cmd find', () => {
  const X = '\n\thttps://'

  function get(manifest = 'freecdn-manifest.txt') {
    const ret = read(manifest)
    // console.log(ret)
    rm(manifest)
    return ret
  }

  describe('basic', () => {
    $`freecdn db --del-all`

    it('local public files', () => {
      cd('find/assets/public')
      $`freecdn find --save`
      expect(get())
        .match(/^\/jquery\.js\n(\thttps:.+?\n)+\thash=.+\n$/)
    })

    function importCustomInfo() {
      $`freecdn db --del-all`
      $`freecdn db --import <<< "
        wM+PPlLHcZenNEqjDFKpiuJrcOoeek6E0V5NxAro/Fc= https://foo/path/to/file1.js
        wM+PPlLHcZenNEqjDFKpiuJrcOoeek6E0V5NxAro/Fc= https://bar/path/to/file2.js
        XTZpbfuMkxViYSW2q370udBiH6h2xPPsbA9GLxfBfBg= http://127.0.0.1:30004/video/test.mp4"
      `
    }

    it('local custom files', () => {
      cd('find/assets/custom')
      importCustomInfo()

      $`freecdn find -s`
      expect(get()).eq(`\
/hello1.js
	https://foo/path/to/file1.js
	https://bar/path/to/file2.js
	hash=wM+PPlLHcZenNEqjDFKpiuJrcOoeek6E0V5NxAro/Fc=

/hello2.js
	https://foo/path/to/file1.js
	https://bar/path/to/file2.js
	hash=wM+PPlLHcZenNEqjDFKpiuJrcOoeek6E0V5NxAro/Fc=

/test.mp4
	http://127.0.0.1:30004/video/test.mp4
	hash=1048576;5gTmVfZtGTG0DnZ5lWRHtUzYmqby6QlJWyCCactVcOU=,JxiEuW1LlyJDBdaqp9yjkXE69knXen4KwNLkQwQ2okY=,iJCzw/q+F4MScRMBkRuFZA+1yKktl3345wIPf7RCE7g=,mzQkV/Nmnbd8OYr63DCoxCNb7apvbHr34cR2c2lLgN0=,ui9tWs/GTNpYVHWTCydnMV5StSIllfdG6sUOY/w3WmM=,VruGSoH/iEhxKzXy7NZEs56PoR7v/lpzmcAwxGVblME=
	size=5540436
`)
      $`freecdn db --del-all`
    })

    it('remote public files', async () => {
      cd('find/empty')
      await runAsync('freecdn find -s --with-urls ../urls-public.txt')
      expect(get())
        .include('http://127.0.0.1:30004/public/jquery.js' + X)
        .not.include('/custom')
    })

    it('remote custom files', async () => {
      cd('find/empty')
      importCustomInfo()

      await runAsync('freecdn find -s --with-urls ../urls-custom.txt')
      expect(get()).eq(`\
http://127.0.0.1:30004/custom/hello1.js
	https://foo/path/to/file1.js
	https://bar/path/to/file2.js
	hash=wM+PPlLHcZenNEqjDFKpiuJrcOoeek6E0V5NxAro/Fc=

http://127.0.0.1:30004/custom/hello2.js
	https://foo/path/to/file1.js
	https://bar/path/to/file2.js
	hash=wM+PPlLHcZenNEqjDFKpiuJrcOoeek6E0V5NxAro/Fc=

http://127.0.0.1:30004/custom/test.mp4
	http://127.0.0.1:30004/video/test.mp4
	hash=1048576;5gTmVfZtGTG0DnZ5lWRHtUzYmqby6QlJWyCCactVcOU=,JxiEuW1LlyJDBdaqp9yjkXE69knXen4KwNLkQwQ2okY=,iJCzw/q+F4MScRMBkRuFZA+1yKktl3345wIPf7RCE7g=,mzQkV/Nmnbd8OYr63DCoxCNb7apvbHr34cR2c2lLgN0=,ui9tWs/GTNpYVHWTCydnMV5StSIllfdG6sUOY/w3WmM=,VruGSoH/iEhxKzXy7NZEs56PoR7v/lpzmcAwxGVblME=
	size=5540436
`)
      $`freecdn db --del-all`
    })

    it('ignore internal files', () => {
      cd('find/with-internal-files')
      $`freecdn find -s manifest.txt`
      expect(get('manifest.txt')).empty
    })
  })

  describe('selected hosts', () => {
    it('single', () => {
      cd('find/assets/public')
      $`freecdn find -s --hosts ajax.cdnjs.com`
      expect(get()).eq(`\
/jquery.js
	https://ajax.cdnjs.com/ajax/libs/jquery/3.2.1/jquery.js
	hash=DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE=
`)
    })

    it('single wc', () => {
      cd('find/assets/public')
      $`freecdn find -s --hosts "*.net"`
      expect(get()).eq(`\
/jquery.js
	https://cdn.jsdelivr.net/gh/cdnjs/cdnjs/ajax/libs/jquery/3.2.1/jquery.js
	https://cdnjs.loli.net/ajax/libs/jquery/3.2.1/jquery.js
	https://cdn.bootcdn.net/ajax/libs/jquery/3.2.1/jquery.js
	hash=DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE=
`)
    })

    it('multi', () => {
      cd('find/assets/public')
      $`freecdn find -s --hosts " ajax.cdnjs.com \t code.jquery.com \n "`
      expect(get()).eq(`\
/jquery.js
	https://ajax.cdnjs.com/ajax/libs/jquery/3.2.1/jquery.js
	https://code.jquery.com/jquery-3.2.1.js
	hash=DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE=
`)
    })

    it('multi wc', () => {
      cd('find/assets/public')
      $`freecdn find -s --hosts "*.cdnjs.com *.org"`
      expect(get()).eq(`\
/jquery.js
	https://ajax.cdnjs.com/ajax/libs/jquery/3.2.1/jquery.js
	https://cdn.staticfile.org/jquery/3.2.1/jquery.js
	hash=DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE=
`)
    })
  })

  describe('img upgrade', () => {
    it('local', () => {
      cd('find/assets/imgs')
      $`freecdn find -s`
      expect(get())
        .include('/1.png' + X)
        .include('/2.png.webp' + X)
        .include('/3.png' + X)
        .include('/3.png.webp' + X)
        .include('/4.jpeg.avif\n\n')
        .include('/4.jpeg.webp\n')  
    })

    it('local with filter', () => {
      cd('find/assets/imgs')
      $`freecdn find -s -f "**/*.webp" --hosts ajax.cdnjs.com`
      expect(get()).eq(`\
/2.png.webp
	https://ajax.cdnjs.com/ajax/libs/open-iconic/1.1.1/webp/wifi-8x.webp
	hash=EmbZc/lfwoRVGFWmzrhR3d8dyI4tXtlampUwLoep9Zs=

/3.png.webp
	https://ajax.cdnjs.com/ajax/libs/open-iconic/1.1.1/png/zoom-out-8x.png
	hash=aJ/yk4vzZNowbPhGlGUPEkY8L9x54uJx32xLa7Bzfzk=
`)
    })

    it('remote', async () => {
      cd('find/empty')
      await runAsync('freecdn find -s --with-urls ../urls-imgs.txt')
      expect(get())
        .include('http://127.0.0.1:30004/imgs/1.png' + X)
        .include('http://127.0.0.1:30004/imgs/2.png.webp' + X)
        .include('http://127.0.0.1:30004/imgs/3.png' + X)
        .include('http://127.0.0.1:30004/imgs/3.png.webp' + X)
        .include('http://127.0.0.1:30004/imgs/4.jpeg.webp\n\n')
        .include('http://127.0.0.1:30004/imgs/4.jpeg.avif\n')
    })
  })
})


describe('cmd js', () => {
  const freecdnJs = require('freecdn-js')
  const jsver = freecdnJs.ver
  let pk = ''

  before(() => {
    pk = $`freecdn key --public`
    pk = pk.trim().replace(/MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE|==/g, '')
  })

  it('make', () => {
    cd('js')
    $`freecdn js --make`
    expect(read('freecdn-loader.min.js'))
      .include('https://unpkg.com/')
      .include('https://cdn.jsdelivr.net')
      .include('https://code.bdstatic.com/')
      .include(pk)

    freecdnJs.buildFiles.forEach(file => {
      expect(read(`freecdn-internal/${jsver}/${file}`))
        .eq(read(`../../node_modules/freecdn-js/dist/${file}`))
    })
  })

  it('cdn partial', () => {
    cd('js')
    $`freecdn js --make --cdn "unpkg jsdelivr"`
    expect(read('freecdn-loader.min.js'))
      .include('https://unpkg.com/')
      .include('https://cdn.jsdelivr.net')
      .not.include('https://code.bdstatic.com/')
  })

  it('cdn custom url', () => {
    cd('js')
    $`freecdn js --make --cdn "https://foo https://bar unpkg"`
    expect(read('freecdn-loader.min.js'))
      .include('https://foo')
      .include('https://bar')
      .include('https://unpkg.com/')
      .not.include('https://cdn.jsdelivr.net/')
  })

  it('cdn none', () => {
    cd('js')
    $`freecdn js --make --cdn none`
    expect(read('freecdn-loader.min.js'))
      .include('0,"freecdn-internal/')    // setTimeut(?,0,"..."
      .not.include('https://unpkg.com/')
      .not.include('https://cdn.jsdelivr.net')
      .not.include('https://code.bdstatic.com/')
  })

  it('setup sw', () => {
    write('sw.js', '// hello world')

    $`freecdn js --setup-sw sw.js`
    expect(read('sw.js'))
      .include(pk)
      .include('/' + jsver + '/')

    $`freecdn js --setup-sw sw.js`
    expect(read('sw.js').split('// ----- freecdn end -----').length)
      .eq(2)

    rm('sw.js')
  })

  after(() => {
    rm('freecdn-loader.min.js')
    rm('freecdn-internal')
  })
})


describe('cmd manifest', () => {
  it('sign and verify', () => {
    cd('manifest/sign')
    write('freecdn-manifest.txt', '# hello')

    $`freecdn manifest --sign`
    expect(read('freecdn-manifest.txt'))
      .include('# hello\n# SIGN: ')

    $`freecdn manifest --verify-sign`
    expect(read('freecdn-manifest.txt'))
      .not.include('incorrect')

    rm('freecdn-manifest.txt')
  })

  it('merge', () => {
    cd('manifest/merge')

    $`freecdn manifest -i main.conf -m patch.conf -o result.conf`
    expect(read('result.conf'))
      .eq(read('../exp-merge.conf'))

    rm('result.conf')
  })
})


describe('cmd db', () => {
  function importRecords() {
    $`freecdn db --import <<< "
      SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio= https://a.foo.com/1_1.gif
      SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio= https://b.foo.com/2_2.gif
      T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA= https://x.bar.com/111.png
      T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA= https://y.bar.com/222.png"
    `
  }

  describe('count', () => {
    const check = (cmd, count) => {
      expect(run(cmd)).eq(count + '\n')
    }

    it('import', async () => {
      $`freecdn db --del-all`
      check(`freecdn db --count`, 0)
      importRecords()
      check(`freecdn db -c`, 4)
    })

    it('count host single', () => {
      check(`freecdn db --count-host a.foo.com`, 1)
      check(`freecdn db --count-host A.FOO.COM`, 1)
      check(`freecdn db --count-host a_foo.com`, 0)
      check(`freecdn db --count-host foo.com`, 0)
      check(`freecdn db --count-host sub.a.foo.com`, 0)
    })
    it('count host multi', () => {
      check(`freecdn db --count-host "a.foo.com b.foo.com"`, 2)
      check(`freecdn db --count-host "a.foo.com x.net"`, 1)
      check(`freecdn db --count-host "x.net y.net"`, 0)
    })

    it('count host single wc', () => {
      check(`freecdn db --count-host "*.foo.com"`, 2)
      check(`freecdn db --count-host "*.f%o.com"`, 0)
      check(`freecdn db --count-host "*.f_o.com"`, 0)
      check(`freecdn db --count-host "*.x.com"`, 0)
      check(`freecdn db --count-host "*"`, 4)
      check(`freecdn db --count-host "*.com"`, 4)
    })
    it('count host multi wc', () => {
      check(`freecdn db --count-host "*.foo.* *.bar.com"`, 4)
      check(`freecdn db --count-host "*.foo.com *.foo"`, 2)
      check(`freecdn db --count-host "foo.* bar.*"`, 0)
    })

    it('count hash single', () => {
      check(`freecdn db --count-hash SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio=`, 2)
      check(`freecdn db --count-hash 11223344556677889900bnN0cnVjdGlvbnMgKl5fXio=`, 0)
    })
    it('count hash multi', () => {
      check(`freecdn db --count-hash "
        SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio=
        T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA="
      `, 4)
      check(`freecdn db --count-hash "
        11223344556677889900bnN0cnVjdGlvbnMgKl5fXio=
        T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA="
      `, 2)
    })
    it('count hash single wc', () => {
      check(`freecdn db --count-hash "S*" -w`, 2)
      check(`freecdn db --count-hash "1*" -w`, 0)
      check(`freecdn db --count-hash "S* X*" -w`, 2)
      check(`freecdn db --count-hash "S* T*" -w`, 4)
    })

    it('count url single', () => {
      check(`freecdn db --count-url https://a.foo.com/1_1.gif`, 1)
      check(`freecdn db --count-url https://a.foo.com/0_0.gif`, 0)
    })
    it('count url multi', () => {
      check(`freecdn db --count-url "
        https://a.foo.com/1_1.gif
        https://b.foo.com/2_2.gif"
      `, 2)
      check(`freecdn db --count-url "
        https://a.foo.com/1_1.gif
        https://a.foo.com/0_0.gif"
      `, 1)
    })
    it('count url single wc', () => {
      check(`freecdn db --count-url "https://*.foo.com/*" -w`, 2)
      check(`freecdn db --count-url "https://*.net/*" -w`, 0)
    })
    it('count url multi wc', () => {
      check(`freecdn db --count-url "
        https://*.foo.com/*
        https://*.bar.com/*" -w
      `, 4)
    })
  })

  describe('list', () => {
    it('list host single', () => {
      expect($`freecdn db --list-host a.foo.com`)
        .include('https://a.foo.com/1_1.gif')
        .not.include('b.foo.com')
        .not.include('bar.com')
    })

    it('list host multi', () => {
      expect($`freecdn db --list-host "*.foo.com *.bar.com"`)
        .include('.foo.com')
        .include('.bar.com')
    })


    it('list hash single', () => {
      expect($`freecdn db --list-hash SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio=`)
        .include('https://a.foo.com/1_1.gif')
        .include('https://b.foo.com/2_2.gif')
        .not.include('https://x.bar.com/111.png')
        .not.include('https://y.bar.com/222.png')
    })

    it('list hash multi', () => {
      expect($`freecdn db --list-hash "
        SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio=
        T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA="
      `).include('https://a.foo.com/1_1.gif')
        .include('https://b.foo.com/2_2.gif')
        .include('https://x.bar.com/111.png')
        .include('https://y.bar.com/222.png')
    })

    it('list hash single wc', () => {
      expect($`freecdn db --list-hash "S*" -w`)
        .include('https://a.foo.com/1_1.gif')
        .include('https://b.foo.com/2_2.gif')
        .not.include('https://x.bar.com/111.png')
        .not.include('https://y.bar.com/222.png')
    })

    it('list hash multi wc', () => {
      expect($`freecdn db --list-hash "S* T*" -w`)
        .include('https://a.foo.com/1_1.gif')
        .include('https://b.foo.com/2_2.gif')
        .include('https://x.bar.com/111.png')
        .include('https://y.bar.com/222.png')
    })


    it('list url single', () => {
      expect($`freecdn db --list-url https://a.foo.com/1_1.gif`)
        .include('https://a.foo.com/1_1.gif')
        .not.include('https://b.foo.com/2_2.gif')
        .not.include('https://x.bar.com/111.png')
        .not.include('https://y.bar.com/222.png')
    })

    it('list url multi', () => {
      expect($`freecdn db --list-url "
        https://a.foo.com/1_1.gif
        https://x.bar.com/111.png"
      `).include('https://a.foo.com/1_1.gif')
        .include('https://x.bar.com/111.png')
        .not.include('https://b.foo.com/2_2.gif')
        .not.include('https://y.bar.com/222.png')
    })

    it('list url single wc', () => {
      expect($`freecdn db --list-url "*.gif" -w`)
        .include('https://a.foo.com/1_1.gif')
        .include('https://b.foo.com/2_2.gif')
        .not.include('https://x.bar.com/111.png')
        .not.include('https://y.bar.com/222.png')
    })

    it('list url single wc includes underscore', () => {
      expect($`freecdn db --list-url "*2_*" -w`)
        .include('https://b.foo.com/2_2.gif')
        .not.include('https://y.bar.com/222.png')
    })

    it('list url multi wc', () => {
      expect($`freecdn db --list-url "*.gif *2*" -w`)
        .include('https://a.foo.com/1_1.gif')
        .include('https://b.foo.com/2_2.gif')
        .include('https://y.bar.com/222.png')
        .not.include('https://x.bar.com/111.png')
    })
  })

  describe('del', () => {
    it('del host single', () => {
      importRecords()
      $`freecdn db --del-host a.foo.com`
      expect($`freecdn db -l`)
        .include('b.foo.com')
        .include('x.bar.com')
        .include('y.bar.com')
        .not.include('a.foo.com')
    })

    it('del host multi', () => {
      importRecords()
      $`freecdn db --del-host "a.foo.com b.foo.com"`
      expect($`freecdn db -l`)
        .include('x.bar.com')
        .include('y.bar.com')
        .not.include('a.foo.com')
        .not.include('b.foo.com')
    })

    it('del host single wc', () => {
      importRecords()
      $`freecdn db --del-host "*.foo.com"`
      expect($`freecdn db -l`)
        .include('x.bar.com')
        .include('y.bar.com')
        .not.include('a.foo.com')
        .not.include('b.foo.com')
    })

    it('del host multi wc', () => {
      importRecords()
      $`freecdn db --del-host "*.foo.com *.bar.com"`
      expect($`freecdn db -l`)
        .not.include('x.bar.com')
        .not.include('y.bar.com')
        .not.include('a.foo.com')
        .not.include('b.foo.com')
    })


    it('del hash single', () => {
      importRecords()
      $`freecdn db --del-hash SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio=`
      expect($`freecdn db -l`)
        .include('T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA=')
        .not.include('SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio=')
    })

    it('del hash multi', () => {
      importRecords()
      $`freecdn db --del-hash "
        SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio=
        T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA="
      `
      expect($`freecdn db -l`)
        .not.include('SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio=')
        .not.include('T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA=')
    })

    it('del hash single wc', () => {
      importRecords()
      $`freecdn db --del-hash "T*" -w`
      expect($`freecdn db -l`)
        .include('SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio=')
        .not.include('T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA=')
    })

    it('del hash multi wc', () => {
      importRecords()
      $`freecdn db --del-hash "T* S*" -w`
      expect($`freecdn db -l`)
        .not.include('T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA=')
        .not.include('SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio=')
    })


    it('del url single', () => {
      importRecords()
      $`freecdn db --del-url https://a.foo.com/1_1.gif`
      expect($`freecdn db -l`)
        .include('https://b.foo.com/2_2.gif')
        .include('https://x.bar.com/111.png')
        .include('https://y.bar.com/222.png')
        .not.include('https://a.foo.com/1_1.gif')
    })

    it('del url multi', () => {
      importRecords()
      $`freecdn db --del-url "
        https://a.foo.com/1_1.gif
        https://b.foo.com/2_2.gif"
      `
      expect($`freecdn db -l`)
        .include('https://x.bar.com/111.png')
        .include('https://y.bar.com/222.png')
        .not.include('https://a.foo.com/1_1.gif')
        .not.include('https://b.foo.com/2_2.gif')
    })

    it('del url single wc', () => {
      importRecords()
      $`freecdn db --del-url "*.gif" -w`
      expect($`freecdn db -l`)
        .include('https://x.bar.com/111.png')
        .include('https://y.bar.com/222.png')
        .not.include('https://a.foo.com/1_1.gif')
        .not.include('https://b.foo.com/2_2.gif')
    })

    it('del url multi wc', () => {
      importRecords()
      $`freecdn db --del-url "*.gif *.png" -w`
      expect($`freecdn db -l`)
        .not.include('https://a.foo.com/1_1.gif')
        .not.include('https://b.foo.com/2_2.gif')
        .not.include('https://x.bar.com/111.png')
        .not.include('https://y.bar.com/222.png')
    })
  })
})

describe('cmd key', () => {
  it('public', () => {
    expect($`freecdn key --public`)
      .match(/MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE[A-Za-z0-9+/]{86,}==/)
  })

  it('update', () => {
    const privateKey = $`freecdn key --private`
    const publicKey = $`freecdn key --public`

    $`freecdn key --update`
    expect($`freecdn key -s`).not.eq(privateKey)
    expect($`freecdn key -p`).not.eq(publicKey)
  })
})


describe('cmd lib', () => {
  it('query single', () => {
    expect($`freecdn lib -q DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE=`)
      .include('DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE=')
  })

  it('query mutli', () => {
    expect($`freecdn lib --query "
      DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE=
      XxDT6/6H7wEVtaCSXnytiCmpAjuuBR7LQW9VwE16TMM=
      DUMMY/6H7wEVtaCSXnytiCmpAjuuBR7LQW9VwE16TMM="
    `).include('DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE=')
      .include('XxDT6/6H7wEVtaCSXnytiCmpAjuuBR7LQW9VwE16TMM=')
      .not.include('DUMMY/6H7wEVtaCSXnytiCmpAjuuBR7LQW9VwE16TMM=')
  })
})


describe('env vars', () => {
  it('http headers', async () => {
    process.env['FREECDN_HTTP_USER_AGENT'] = CUSTOM_UA
    process.env['FREECDN_HTTP_REFERER'] = CUSTOM_REFERER
  
    let check = true
  
    app.use((req, res, next) => {
      if (check) {
        if (req.headers['user-agent'] !== CUSTOM_UA) {
          return res.send('invalid user-agent')
        }
        if (req.headers['referer'] !== CUSTOM_REFERER) {
          return res.send('invalid referrer')
        }
      }
      next()
    })

    cd('find/empty')
    const ret = await runAsync('freecdn find --with-urls ../urls-public.txt')
    expect(ret)
      .include('http://127.0.0.1:30004/public/jquery.js')

    check = false
  })
})