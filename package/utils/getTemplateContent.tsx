import { JSONContent } from '@tiptap/react';

export const getTemplateContent = (
    templateQuery: string
): JSONContent | null => {
    switch (templateQuery) {
        case 'meeting-notes':
            return {
                type: 'doc',
                content: [
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 1,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: '[Date] | [Event]',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 3,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Notes',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'bulletList',
                                attrs: {
                                    tight: true,
                                },
                                content: [
                                    {
                                        type: 'listItem',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'Add note item',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: 'listItem',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'Add note item',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 3,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Action items',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'taskList',
                                content: [
                                    {
                                        type: 'taskItem',
                                        attrs: {
                                            checked: false,
                                        },
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'Add action item',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: 'taskItem',
                                        attrs: {
                                            checked: false,
                                        },
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'Add action item',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                title: 'Meeting Notes',
            };
        case 'todo-list':
            return {
                type: 'doc',
                content: [
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 1,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: '📋 To-do List',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'table',
                                content: [
                                    {
                                        type: 'tableRow',
                                        content: [
                                            {
                                                type: 'tableHeader',
                                                attrs: {
                                                    colspan: 1,
                                                    rowspan: 1,
                                                    colwidth: null,
                                                },
                                                content: [
                                                    {
                                                        type: 'paragraph',
                                                        attrs: {
                                                            textAlign: 'left',
                                                        },
                                                        content: [
                                                            {
                                                                type: 'text',
                                                                text: 'Action item',
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            {
                                                type: 'tableHeader',
                                                attrs: {
                                                    colspan: 1,
                                                    rowspan: 1,
                                                    colwidth: null,
                                                },
                                                content: [
                                                    {
                                                        type: 'paragraph',
                                                        attrs: {
                                                            textAlign: 'left',
                                                        },
                                                        content: [
                                                            {
                                                                type: 'text',
                                                                text: 'Deadline',
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: 'tableRow',
                                        content: [
                                            {
                                                type: 'tableCell',
                                                attrs: {
                                                    colspan: 1,
                                                    rowspan: 1,
                                                    colwidth: null,
                                                },
                                                content: [
                                                    {
                                                        type: 'taskList',
                                                        content: [
                                                            {
                                                                type: 'taskItem',
                                                                attrs: {
                                                                    checked: false,
                                                                },
                                                                content: [
                                                                    {
                                                                        type: 'paragraph',
                                                                        attrs: {
                                                                            textAlign: 'left',
                                                                        },
                                                                        content: [
                                                                            {
                                                                                type: 'text',
                                                                                text: 'Add action item',
                                                                            },
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            {
                                                type: 'tableCell',
                                                attrs: {
                                                    colspan: 1,
                                                    rowspan: 1,
                                                    colwidth: null,
                                                },
                                                content: [
                                                    {
                                                        type: 'paragraph',
                                                        attrs: {
                                                            textAlign: 'left',
                                                        },
                                                        content: [
                                                            {
                                                                type: 'text',
                                                                text: 'DD.MM.YYYY',
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: 'tableRow',
                                        content: [
                                            {
                                                type: 'tableCell',
                                                attrs: {
                                                    colspan: 1,
                                                    rowspan: 1,
                                                    colwidth: null,
                                                },
                                                content: [
                                                    {
                                                        type: 'taskList',
                                                        content: [
                                                            {
                                                                type: 'taskItem',
                                                                attrs: {
                                                                    checked: false,
                                                                },
                                                                content: [
                                                                    {
                                                                        type: 'paragraph',
                                                                        attrs: {
                                                                            textAlign: 'left',
                                                                        },
                                                                        content: [
                                                                            {
                                                                                type: 'text',
                                                                                text: 'Add action item',
                                                                            },
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            {
                                                type: 'tableCell',
                                                attrs: {
                                                    colspan: 1,
                                                    rowspan: 1,
                                                    colwidth: null,
                                                },
                                                content: [
                                                    {
                                                        type: 'paragraph',
                                                        attrs: {
                                                            textAlign: 'left',
                                                        },
                                                        content: [
                                                            {
                                                                type: 'text',
                                                                text: 'DD.MM.YYYY',
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: 'tableRow',
                                        content: [
                                            {
                                                type: 'tableCell',
                                                attrs: {
                                                    colspan: 1,
                                                    rowspan: 1,
                                                    colwidth: null,
                                                },
                                                content: [
                                                    {
                                                        type: 'taskList',
                                                        content: [
                                                            {
                                                                type: 'taskItem',
                                                                attrs: {
                                                                    checked: false,
                                                                },
                                                                content: [
                                                                    {
                                                                        type: 'paragraph',
                                                                        attrs: {
                                                                            textAlign: 'left',
                                                                        },
                                                                        content: [
                                                                            {
                                                                                type: 'text',
                                                                                text: 'Add action item',
                                                                            },
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            {
                                                type: 'tableCell',
                                                attrs: {
                                                    colspan: 1,
                                                    rowspan: 1,
                                                    colwidth: null,
                                                },
                                                content: [
                                                    {
                                                        type: 'paragraph',
                                                        attrs: {
                                                            textAlign: 'left',
                                                        },
                                                        content: [
                                                            {
                                                                type: 'text',
                                                                text: 'DD.MM.YYYY',
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                title: 'To-do List',
            };
        case 'brainstorm':
            return {
                type: 'doc',
                content: [
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 1,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: '💡 Brainstorming',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 2,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: '[Issues & Goals]',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'bulletList',
                                attrs: {
                                    tight: true,
                                },
                                content: [
                                    {
                                        type: 'listItem',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'First idea',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: 'listItem',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'Second idea',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: 'listItem',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'Third idea',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 2,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Summaries:',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'bulletList',
                                attrs: {
                                    tight: true,
                                },
                                content: [
                                    {
                                        type: 'listItem',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'Summary 1',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: 'listItem',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: 'Summary 2',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                title: 'Brainstorming',
            };
        case 'breathe':
            return {
                type: 'doc',
                content: [
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'center',
                                    level: 1,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Take your time',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'center',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Just breathe',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'resizableMedia',
                                attrs: {
                                    src: 'https://i.imgur.com/Huou7Gh.gif',
                                    'media-type': 'img',
                                    alt: null,
                                    title: null,
                                    width: '100%',
                                    height: 'auto',
                                    dataAlign: 'center',
                                    dataFloat: null,
                                },
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'center',
                                    level: 3,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Follow the breathing triangle, do it 5 times',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'center',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: "When you are overwhelmed at work… or after handling a tough situation... when the market plumets.. when everything goes wrong.. or you're having a simple writer's block",
                                    },
                                ],
                            },
                        ],
                    },
                ],
                title: 'Breathe',
            };
        case 'intern-notes':
            return {
                type: 'doc',
                content: [
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 1,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: '📝 Intern notes',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'left',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Source:',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'actionButton',
                                attrs: {
                                    data: null,
                                },
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'actionButton',
                                attrs: {
                                    data: null,
                                },
                            },
                        ],
                    },
                    {
                        type: 'columns',
                        attrs: {
                            layout: 'align-center',
                        },
                        content: [
                            {
                                type: 'column',
                                attrs: {
                                    position: '',
                                },
                                content: [
                                    {
                                        type: 'dBlock',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        marks: [
                                                            {
                                                                type: 'bold',
                                                            },
                                                        ],
                                                        text: 'Person 1 quotes',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                type: 'column',
                                attrs: {
                                    position: '',
                                },
                                content: [
                                    {
                                        type: 'dBlock',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                attrs: {
                                                    textAlign: 'left',
                                                },
                                                content: [
                                                    {
                                                        type: 'text',
                                                        marks: [
                                                            {
                                                                type: 'bold',
                                                            },
                                                        ],
                                                        text: 'Person 2 quotes',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                title: 'Intern Notes',
            };
        case 'pretend-to-work':
            return {
                type: 'doc',
                content: [
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 1,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'textStyle',
                                                attrs: {
                                                    fontFamily: 'Georgia, serif',
                                                    color: '',
                                                },
                                            },
                                        ],
                                        text: 'Some ways to use ZK-SNARKs for privacy',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'left',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'ZK-SNARKs are a powerful cryptographic tool, and an increasingly important part of the applications that people are building both in the blockchain space and beyond. But they are complicated, both in terms of ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'italic',
                                            },
                                        ],
                                        text: 'how they work',
                                    },
                                    {
                                        type: 'text',
                                        text: ', and in terms of ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'italic',
                                            },
                                        ],
                                        text: 'how you can use them',
                                    },
                                    {
                                        type: 'text',
                                        text: '.',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 2,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'What does a ZK-SNARK do?',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'left',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Suppose that you have a public input x, a private input w, and a (public) function ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'textStyle',
                                                attrs: {
                                                    fontFamily: 'MJXc-TeX-math-Iw',
                                                    color: '',
                                                },
                                            },
                                        ],
                                        text: 'f(x,w)→{True,False}',
                                    },
                                    {
                                        type: 'text',
                                        text: ' that performs some kind of verification on the inputs. With a ZK-SNARK, you can prove that you know an w such that ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'textStyle',
                                                attrs: {
                                                    fontFamily: 'MJXc-TeX-math-Iw',
                                                    color: '',
                                                },
                                            },
                                        ],
                                        text: 'f(x,w)=True',
                                    },
                                    {
                                        type: 'text',
                                        text: ' for some given ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'textStyle',
                                                attrs: {
                                                    fontFamily: 'MJXc-TeX-math-Iw',
                                                    color: '',
                                                },
                                            },
                                        ],
                                        text: 'f',
                                    },
                                    {
                                        type: 'text',
                                        text: ' and ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'textStyle',
                                                attrs: {
                                                    fontFamily: 'MJXc-TeX-math-Iw',
                                                    color: '',
                                                },
                                            },
                                        ],
                                        text: 'x',
                                    },
                                    {
                                        type: 'text',
                                        text: ', without revealing what ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'textStyle',
                                                attrs: {
                                                    fontFamily: 'MJXc-TeX-math-Iw',
                                                    color: '',
                                                },
                                            },
                                        ],
                                        text: 'w',
                                    },
                                    {
                                        type: 'text',
                                        text: ' is. Additionally, the verifier can verify the proof much faster than it would take for them to compute ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'textStyle',
                                                attrs: {
                                                    fontFamily: 'MJXc-TeX-math-Iw',
                                                    color: '',
                                                },
                                            },
                                        ],
                                        text: 'f(x,w)',
                                    },
                                    {
                                        type: 'text',
                                        text: ' themselves, even if they know ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'textStyle',
                                                attrs: {
                                                    fontFamily: 'MJXc-TeX-math-Iw',
                                                    color: '',
                                                },
                                            },
                                        ],
                                        text: 'w',
                                    },
                                    {
                                        type: 'text',
                                        text: '.',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'resizableMedia',
                                attrs: {
                                    src: 'https://vitalik.eth.limo/images/using_snarks/definition.png',
                                    'media-type': 'img',
                                    alt: null,
                                    title: null,
                                    width: '100%',
                                    height: 'auto',
                                    dataAlign: 'center',
                                    dataFloat: null,
                                },
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'left',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'This gives the ZK-SNARK its two properties: ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'bold',
                                            },
                                        ],
                                        text: 'privacy',
                                    },
                                    {
                                        type: 'text',
                                        text: ' and ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'bold',
                                            },
                                        ],
                                        text: 'scalability',
                                    },
                                    {
                                        type: 'text',
                                        text: '. As mentioned above, in this post our examples will focus on privacy.',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 2,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Holding centralized parties accountable',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'left',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Sometimes, you need to build a scheme that has a central "operator" of some kind. This could be for many reasons: sometimes it\'s for scalability, and sometimes it\'s for privacy - specifically, the privacy of data held by the operator.',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'left',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'The MACI coercion-resistant voting system, for example, requires voters to submit their votes on-chain encrypted to a secret key held by a central operator. The operator would decrypt all the votes on-chain, count them up, and reveal the final result, along with a ZK-SNARK proving that they did everything correctly. This extra complexity is necessary to ensure a strong privacy property (called ',
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'bold',
                                            },
                                        ],
                                        text: 'coercion-resistance',
                                    },
                                    {
                                        type: 'text',
                                        text: '): that users cannot prove to others how they voted even if they wanted to.',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'left',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Thanks to blockchains and ZK-SNARKs, the amount of trust in the operator can be kept very low. A malicious operator could still break coercion resistance, but because votes are published on the blockchain, the operator cannot cheat by censoring votes, and because the operator must provide a ZK-SNARK, they cannot cheat by mis-calculating the result.',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'heading',
                                attrs: {
                                    textAlign: 'left',
                                    level: 2,
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Combining ZK-SNARKs with MPC',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'left',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: "A more advanced use of ZK-SNARKs involves making proofs over computations where the inputs are split between two or more parties, and we don't want each party to learn the other parties' inputs. You can satisfy the privacy requirement with ",
                                    },
                                    {
                                        type: 'text',
                                        marks: [
                                            {
                                                type: 'link',
                                                attrs: {
                                                    href: 'https://vitalik.eth.limo/general/2020/03/21/garbled.html',
                                                    target: '_blank',
                                                    rel: 'noopener noreferrer',
                                                    class:
                                                        'color-text-link font-bold transition-colors cursor-pointer select-text pointer-events-auto',
                                                },
                                            },
                                        ],
                                        text: 'garbled circuits',
                                    },
                                    {
                                        type: 'text',
                                        text: ' in the 2-party case, and more complicated multi-party computation protocols in the N-party case. ZK-SNARKs can be combined with these protocols to do verifiable multi-party computation.',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'paragraph',
                                attrs: {
                                    textAlign: 'left',
                                },
                                content: [
                                    {
                                        type: 'text',
                                        text: 'This could enable more advanced reputation systems where multiple participants can perform joint computations over their private inputs, it could enable privacy-preserving but authenticated data markets, and many other applications. That said, note that the math for doing this efficiently is still relatively in its infancy.',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'dBlock',
                        content: [
                            {
                                type: 'blockquote',
                                content: [
                                    {
                                        type: 'paragraph',
                                        attrs: {
                                            textAlign: 'left',
                                        },
                                        content: [
                                            {
                                                type: 'text',
                                                text: 'Read the full article by ',
                                            },
                                            {
                                                type: 'text',
                                                marks: [
                                                    {
                                                        type: 'link',
                                                        attrs: {
                                                            href: 'https://vitalik.eth.limo/general/2021/01/26/snarks.html',
                                                            target: '_blank',
                                                            rel: 'noopener noreferrer',
                                                            class:
                                                                'color-text-link font-bold transition-colors cursor-pointer select-text pointer-events-auto',
                                                        },
                                                    },
                                                ],
                                                text: 'Vitalik Buterin',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                title: 'Pretend To Work',
            };
        default:
            return null;
    }
};
