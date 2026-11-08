#!/usr/bin/env python3
"""Analyze a recorded dataset, never silently substitute synthetic mainnet data."""
import argparse, json, math, random, statistics
from pathlib import Path
CONFIG=json.loads((Path(__file__).resolve().parents[1]/'src/balance.json').read_text())
def height(value,tier=1):
    anchors=CONFIG['anchors']
    if value<100000: result=4+8*math.sqrt(value/100000)
    else:
        i=0
        while i+1<len(anchors) and value>=anchors[i+1][0]: i+=1
        v,h=anchors[i]
        if i+1==len(anchors): result=h*1.5**math.log10(value/v)
        else:
            nv,nh=anchors[i+1];t=math.log(value/v)/math.log(nv/v);result=math.exp(math.log(h)+t*math.log(nh/h))
    return math.floor(result*CONFIG['tiers'][tier-1]['size']+.5)
def width(h):return min(96,max(14,math.floor(12+.18*h+.5)))
def clears(h,w,target,air=False,speed=CONFIG['physics']['speed']):
    """Search finite launch timings and double-jump timings across the entire hitbox.
    This is an ideal timing reference, not a claim about a human player's skill.
    """
    if h>target:return False
    dt=1/120
    for lead in range(10,161,6):
      for second in ([None,.2,.4,.6] if air else [None]):
        y=0;v=min(285*math.sqrt(target/70),math.sqrt(2*570*110));t=-lead/speed;doubled=False;ok=True
        while t<(w+15)/speed:
          if second is not None and not doubled and t+lead/speed>=second:
            v=math.sqrt(2*570*max(0,170-y));doubled=True
          g=570 if v>0 else 850;v-=g*dt;y=max(0,y+v*dt)
          if 0<=t<=(w+15)/speed and y+2<h-2:ok=False;break
          t+=dt
        if ok:return True
    return False
def percentile(values,q):
    seq=sorted(values)
    if not seq:return None
    pos=(len(seq)-1)*q;lo=int(pos);hi=min(len(seq)-1,lo+1);return seq[lo]*(hi-pos)+seq[hi]*(pos-lo) if hi!=lo else seq[lo]
def analyze(data,seeds=50,tier=1):
    if 'events' in data:rows=[e['plant'] for e in data['events'] if e.get('event')=='transaction']
    else:rows=data.get('transactions',[])
    unique={r['txid']:int(r.get('value',r.get('sats',0))) for r in rows if r.get('txid')}
    values=list(unique.values());heights=[height(v,tier) for v in values]
    report={'source':data.get('source','unspecified'),'synthetic':bool(data.get('synthetic',False)),'from':data.get('start',data.get('capturedAt')),'to':data.get('end',data.get('capturedAt')),'uniqueTransactions':len(values),'balanceVersion':CONFIG['balanceVersion'],'tier':tier,'warning':'Draft mapping; not a whole-mempool distribution. Finite timing search is not a proof of impossibility below the apex. Human errors and the full skill economy are excluded.','valuePercentiles':{str(q):percentile(values,q/100) for q in [0,25,50,75,90,95,99,100]},'heightPercentiles':{str(q):percentile(heights,q/100) for q in [0,25,50,75,90,95,99,100]},'references':{}}
    cache={}
    for label,target,air in [('beginner',70,False),('developed',105,False),('aerial',170,True)]:
      impossible=[]
      for h in heights:
        key=(h,width(h),target,air)
        if key not in cache:cache[key]=not clears(*key)
        impossible.append(cache[key])
      runs={}
      for rescues in [0,1,2]:
        times=[];censored=0
        for seed in range(seeds):
          order=list(heights);random.Random(seed).shuffle(order);available=rescues;seconds=0;dead=False
          for i,h in enumerate(order):
            seconds=5.5+sum(CONFIG['physics']['spacing'])*(i//4)+sum(CONFIG['physics']['spacing'][:i%4])
            speed=CONFIG['physics']['speed']*min(CONFIG['physics']['maxSpeedFactor'],1+seconds/1200)
            key=(h,width(h),target,air,round(speed/5)*5)
            if key not in cache:cache[key]=not clears(*key)
            blocked=cache[key]
            if blocked:
              if available:available-=1
              else:dead=True;break
          censored+=not dead;times.append(seconds)
        runs[str(rescues)]={'medianSeconds':statistics.median(times) if times else None,'meanSeconds':statistics.mean(times) if times else None,'stdevSeconds':statistics.pstdev(times) if times else None,'minSeconds':min(times,default=None),'maxSeconds':max(times,default=None),'datasetExhaustedWithoutDeath':censored,'seeds':seeds}
      report['references'][label]={'geometricallyImpossibleFraction':sum(h>target for h in heights)/len(heights) if heights else None,'noSolutionInFiniteTimingSearchFraction':sum(impossible)/len(impossible) if impossible else None,'runsByRescueBudget':runs}
    return report
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('dataset',type=Path);p.add_argument('--tier',type=int,default=1,choices=range(1,7));p.add_argument('--seeds',type=int,default=50);p.add_argument('--output',type=Path);a=p.parse_args();result=json.dumps(analyze(json.loads(a.dataset.read_text()),a.seeds,a.tier),indent=2)
 if a.output:a.output.write_text(result+'\n')
 else:print(result)
