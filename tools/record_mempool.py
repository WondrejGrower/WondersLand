#!/usr/bin/env python3
"""Bounded recent-transaction recorder, at most one request per 15 seconds."""
import argparse,json,time
from urllib.request import urlopen,Request
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--seconds',type=int,default=300);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
start=time.time();rows={}
try:
 while True:
  with urlopen(Request('https://mempool.space/api/mempool/recent',headers={'User-Agent':'WondersLandResearch/0.3'}),timeout=10) as r:
   for row in json.load(r):
    if len(rows)<10000:rows.setdefault(row['txid'],{**row,'value':str(row['value']),'observedAt':time.time()})
  if time.time()-start>=a.seconds or len(rows)>=10000:break
  time.sleep(15)
finally:
 a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps({'source':'mempool.space/api/mempool/recent','synthetic':False,'start':start,'end':time.time(),'transactions':list(rows.values())},indent=2)+'\n')
