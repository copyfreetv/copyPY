## v1 (16-03-2024) TrueFriend

import requests,re,json,os
from bs4 import BeautifulSoup
from urllib.parse import urlparse,unquote,parse_qs
import datetime
from clint.textui import colored
########################################################################################
web_movie = "https://moviesdoofree.com/"

#################################################

f_path = r"E:\Moviesdoofree\\"

#f_path = "C://000.UpdatePlaylist/"
os.makedirs(f_path, exist_ok=True)

########################################################################################
W_W3U = 1       # 1 = เขียน ไฟล์ w3u 
W_M3U = 1       # 1 = เขียน ไฟล์ m3u 

#################################################
M_f = 1         #ห้ามแก้

#################################################
aseries = """{
"name": "",
"author": "  ",
"info": "MoviesdσσFree",
"image": "",
"stations": []}
"""
########################################################################################
from datetime import datetime
now = datetime.now()
date = now.strftime("%d")
mo = now.strftime("%m")
month = ['','ม.ค.','ก.พ.','มี.ค','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
timeday = f'{date} {month[int(mo)]} {int(now.strftime("%Y"))+543}'
timehour = now.strftime("%H:%M")
dt_string = now.strftime("%d/%m/%Y %H:%M:%S")
#################################################
def has_id(tag):
    return tag.has_attr('id')

headers = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36"
jseries = json.loads(aseries)
referer = '{uri.scheme}://{uri.netloc}/'.format(uri=urlparse(web_movie))
sess = requests.Session()
sess.headers.update({'User-Agent': headers,'referer': referer})
home_page = sess.get(web_movie)
home_page.encoding = home_page.apparent_encoding
soup = BeautifulSoup(home_page.content, "lxml")

logo = "http://system.playerza.com/web/moviesdoofree/logo/moviesdoofree_logo.png"
logo = "https://moviesdoofree.com/wp-content/uploads/2025/05/moviesdoofree_logo.png"
#logo = "https://www.icegif.com/wp-content/uploads/2023/10/icegif-969.gif"
cname = soup.find(class_="px-movie-header").get_text().strip()
jseries['name'] = cname
jseries['image'] = logo
jseries['author'] = jseries['author']  + timeday +" "+ timehour
wname = unquote(urlparse(web_movie).netloc.strip('.').split('.')[-2])
f_w3u = wname + "_" +cname+ ".w3u"
f_m3u = wname + "_" +cname+ ".m3u"
if soup.find(class_="wp-pagenavi"):
    nav = soup.find(class_="wp-pagenavi")
    pcurrent = nav.span.get_text().split()[1]
    pmax = nav.span.get_text().split()[-1]
else:
    pcurrent = 1
    pmax = 2
last_page = pmax
#############################  แก้ไขหน้าเริ่มหน้า จบหน้าตรงนี้นะ ##########################
pcurrent = 1    #หน้าเริ่ม
# pmax = 20      #หน้าจบ  ให้ปิดด้วย comment เสมอไม่ให้ใช้

if int(pmax) > int(last_page): pmax = last_page
if pcurrent!=1:f_w3u = re.sub(".w3u",f'_p{pcurrent}.w3u',f_w3u)
###################################################################################
print("Start at Page %s to Page %s" % (pcurrent,pmax))
for num in range(int(pcurrent), int(pmax)+1):
    if num == 1:
        plink = web_movie
    else:
        subfix = "page/%s/" % (num)  
        plink = web_movie + subfix
    home_page = sess.get(plink)
    soup = BeautifulSoup(home_page.content, "html.parser")
    divs = soup.find('div',class_="nag cf").find_all(has_id)
    smax = len(divs)
    # print(smax)
    if smax ==0:
        print(f'--- No Content in Page {num} ------------------')
        continue
    print(colored.yellow("[Page %s/%s] " % (num,pmax)))

    for s,div in enumerate(divs,start=1):
        pname = div.a.get_text()
        purl = div.a['href']
        try:
            ppic = div.img['src']
        except:
            ppic = logo
        eprint = "[%s/%s] %s " % (s,smax,pname)
        print(eprint)
        r = sess.get(purl)
        soup = BeautifulSoup(r.content,"lxml")
        try:
            plink = soup.find('iframe')['src']
        except:
            continue
        r = sess.get(plink)
        try:
            plink = re.search(r"file: '(.+?)'",r.text).group(1)
        except:
            print('no video to play')
            continue
            # print(r.text,r.status_code)
        if W_M3U:
            r = sess.get(plink)
            suff = r.text.splitlines()[-1]
            plink = plink.rsplit('/',1)[0]+'/'+suff
        print(plink)
        jseries['stations'].append({"name":pname,"info":"","image":ppic,"url":plink})   ## ,"referer":referer
        if W_W3U:
            with open(f_path+f_w3u, 'w',encoding='utf-8') as f:
                json.dump(jseries, f, indent=1, ensure_ascii=False) 
        if W_M3U:
            if M_f:
                with open(f_path+f_m3u, 'w',encoding='utf-8') as f:
                    f.write("#EXTM3U\n")
                    f.close()
                    M_f = 0
            with open(f_path+f_m3u, 'a',encoding='utf-8') as f:
                f.write(f'#EXTINF:-1 tvg-logo="{ppic}" group-title="" ,{pname}\n')
                # f.write(f'#EXTVLCOPT:http-referrer={referer}\n')
                f.write(f'{plink}\n')
                f.close() 


print("THE END")
if W_W3U:
    out  = f_path+f_w3u
    re.sub(r' ', '', out)
    out  = "Go to " + out
    print(out)
if W_M3U:
    out  = f_path+f_m3u
    re.sub(r' ', '', out)
    out  = "M3u Go to " + out
    print(out)
