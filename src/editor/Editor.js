import React, { useEffect, useState } from 'react';
import EditorComponent from './EditorComponent';

const Editor = () => {

  const list = [
    {
      id: 1,
      speakerName: "Speaker 1",
      segments: [
        { id: "seg_1_1", start: 1, end: 6, audioUrl: 'https://fameplay-dev.s3.amazonaws.com/projects/68efff77423e7a278aec4ae5/audios/68efff79423e7a278aec4af7/68f28a4e423e7a278aee3305-1760800182263.mp3', text: 'testing test 1' },
        { id: "seg_1_2", start: 15, end: 20, audioUrl: '', text: 'testing test 2' },
        { id: "seg_1_3", start: 35, end: 40, audioUrl: 'https://fameplay-dev.s3.amazonaws.com/projects/68efff77423e7a278aec4ae5/audios/68efff79423e7a278aec4af7/68f28a4e423e7a278aee3305-1760800182263.mp3', text: 'testing test 3' },
      ]
    },
    {
      id: 2,
      speakerName: "Speaker 2",
      segments: [
        { id: "seg_2_1", start: 8, end: 13, audioUrl: 'https://fameplay-dev.s3.amazonaws.com/projects/68efff77423e7a278aec4ae5/audios/68efff79423e7a278aec4af7/68f28a4e423e7a278aee3305-1760800182263.mp3', text: 'testing test 4' },
        { id: "seg_2_2", start: 20, end: 25, audioUrl: '', text: 'testing test 5' },
        { id: "seg_2_3", start: 27, end: 32, audioUrl: 'https://fameplay-dev.s3.amazonaws.com/projects/68efff77423e7a278aec4ae5/audios/68efff79423e7a278aec4af7/68f28a4e423e7a278aee3305-1760800182263.mp3', text: 'testing test 6' },
      ]
    }
  ];

  const originalMedia = 'https://fameplay-dev.s3.amazonaws.com/projects/68efff77423e7a278aec4ae5/audios/68efff79423e7a278aec4af7/68f28a4e423e7a278aee3305-1760800182263.mp3';


  const [speakerWiseTrack, setSpeakerWiseTrack] = useState([]);

  useEffect ( () => {
    setSpeakerWiseTrack(list);
  },[])

  return (
      <>
        <EditorComponent speakerWiseTrack={speakerWiseTrack} showOriginalMedia={true} originalMedia={originalMedia} pixelsPerSecond={30} totalDuration ={120} />
      </>
  );
};

export default Editor;
